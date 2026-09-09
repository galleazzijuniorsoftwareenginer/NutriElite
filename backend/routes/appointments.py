from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.database import SessionLocal
from backend.models import Appointment, Patient, User
from backend.routes.auth import verify_token
from backend.schemas.appointments import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from backend.services.email_service import send_email, render_branded_email

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _serialize(appt: Appointment, patient_name: str) -> dict:
    return {
        "id": appt.id,
        "user_id": appt.user_id,
        "patient_id": appt.patient_id,
        "patient_name": patient_name,
        "scheduled_at": appt.scheduled_at,
        "duration_minutes": appt.duration_minutes,
        "status": appt.status,
        "notes": appt.notes,
        "reminder_sent": bool(appt.reminder_sent),
    }


def _send_appointment_email(patient_email: str, subject: str, heading: str, appt: Appointment, extra: str = ""):
    fecha_str = appt.scheduled_at.strftime("%d/%m/%Y a las %H:%M")
    html = render_branded_email(
        heading,
        f"""
        <p style="color:#6b6584;font-size:14px;margin-bottom:16px;">
          Tu cita está agendada para el <b>{fecha_str}</b> ({appt.duration_minutes} min).
        </p>
        {extra}
        """,
    )
    send_email(patient_email, subject, html)


@router.post("/appointments", response_model=AppointmentResponse)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    patient = db.query(Patient).filter(Patient.id == data.patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    appt = Appointment(
        user_id=user.id,
        patient_id=data.patient_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    if patient.email:
        _send_appointment_email(
            patient.email,
            "Cita confirmada — NutriElite",
            "Tu cita fue agendada ✅",
            appt,
        )

    return _serialize(appt, patient.name)


@router.get("/appointments", response_model=list[AppointmentResponse])
def list_appointments(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    upcoming_only: bool = False,
):
    user = db.query(User).filter(User.username == token["sub"]).first()
    query = db.query(Appointment).filter(Appointment.user_id == user.id)
    if upcoming_only:
        query = query.filter(Appointment.scheduled_at >= datetime.utcnow(), Appointment.status == "scheduled")
    appointments = query.order_by(Appointment.scheduled_at.asc()).all()

    patient_ids = {a.patient_id for a in appointments}
    patients = {p.id: p.name for p in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()}
    return [_serialize(a, patients.get(a.patient_id, "—")) for a in appointments]


@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    user = db.query(User).filter(User.username == token["sub"]).first()
    appt = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == user.id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    return _serialize(appt, patient.name if patient else "—")


@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    appt = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == user.id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita não encontrada")
    db.delete(appt)
    db.commit()
    return {"ok": True}


@router.post("/appointments/{appointment_id}/send-reminder")
def send_reminder(appointment_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Dispara el email de recordatorio manualmente. Un job programado externo
    (ej. Railway cron) podría llamar este mismo endpoint para cada cita
    próxima en vez de depender de un click manual — no hay infraestructura
    de cron en este proyecto todavía, así que por ahora es on-demand."""
    user = db.query(User).filter(User.username == token["sub"]).first()
    appt = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.user_id == user.id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita não encontrada")
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    if not patient or not patient.email:
        raise HTTPException(status_code=400, detail="El paciente no tiene email registrado")

    _send_appointment_email(
        patient.email,
        "Recordatorio de cita — NutriElite",
        "📅 Recordatorio de tu próxima cita",
        appt,
    )
    appt.reminder_sent = 1
    db.commit()
    return {"ok": True}


@router.get("/appointments/due-reminders", response_model=list[AppointmentResponse])
def due_reminders(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Citas en las próximas 24h que aún no recibieron recordatorio —
    pensado para que el frontend resalte cuáles necesitan un recordatorio."""
    user = db.query(User).filter(User.username == token["sub"]).first()
    window_end = datetime.utcnow() + timedelta(hours=24)
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == user.id,
            Appointment.status == "scheduled",
            Appointment.reminder_sent == 0,
            Appointment.scheduled_at >= datetime.utcnow(),
            Appointment.scheduled_at <= window_end,
        )
        .order_by(Appointment.scheduled_at.asc())
        .all()
    )
    patient_ids = {a.patient_id for a in appointments}
    patients = {p.id: p.name for p in db.query(Patient).filter(Patient.id.in_(patient_ids)).all()}
    return [_serialize(a, patients.get(a.patient_id, "—")) for a in appointments]
