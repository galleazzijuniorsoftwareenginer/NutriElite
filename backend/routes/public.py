from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Plan, Patient, Appointment, User, NutritionistProfile
from backend.services.shopping_list_service import build_shopping_list
from backend.services.email_service import send_email, render_branded_email

router = APIRouter(prefix="/public")


def _naive(dt: datetime) -> datetime:
    """Postgres devuelve datetime timezone-aware (DateTime(timezone=True) se
    respeta), mientras que SQLite en dev local lo guarda naive — comparar
    directamente entre sí lanza TypeError en producción. Todo se normaliza a
    naive-UTC antes de comparar."""
    return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt

GOAL_LABEL = {"cut": "Pérdida de peso", "bulk": "Ganancia de masa", "maintenance": "Mantenimiento"}

BOOKING_DURATION_MINUTES = 60
BOOKING_WINDOW_DAYS = 60


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/plans/{public_token}")
def get_public_plan(public_token: str, db: Session = Depends(get_db)):
    """Vista pública del plan para el paciente — sin autenticación, sin datos
    clínicos ni de contacto. Solo lo necesario para seguir su cardápio."""
    plan = db.query(Plan).filter(Plan.public_token == public_token).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Enlace no válido o expirado")

    weekly_menu = plan.weekly_menu or {"semana": []}
    shopping_list = build_shopping_list(weekly_menu) if weekly_menu.get("semana") else []

    return {
        "patient_first_name": (plan.patient_name or "").split(" ")[0] or "Paciente",
        "goal_label": GOAL_LABEL.get(plan.goal, plan.goal),
        "get": round(plan.get, 0) if plan.get else None,
        "weekly_menu": weekly_menu,
        "shopping_list": shopping_list,
        "can_book": plan.patient_id is not None,
    }


@router.get("/plans/{public_token}/busy-slots")
def get_busy_slots(public_token: str, db: Session = Depends(get_db)):
    """Horarios ya ocupados del nutricionista en los próximos días — sin
    exponer nombres de pacientes ni ningún otro dato, solo para que el
    paciente evite elegir un horario que ya está tomado."""
    plan = db.query(Plan).filter(Plan.public_token == public_token).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Enlace no válido o expirado")

    window_end = datetime.utcnow() + timedelta(days=BOOKING_WINDOW_DAYS)
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == plan.user_id,
            Appointment.status == "scheduled",
            Appointment.scheduled_at >= datetime.utcnow(),
            Appointment.scheduled_at <= window_end,
        )
        .all()
    )
    return [{"scheduled_at": a.scheduled_at, "duration_minutes": a.duration_minutes} for a in appointments]


class PublicBookingRequest(BaseModel):
    scheduled_at: datetime
    notes: str = ""


@router.post("/plans/{public_token}/appointments")
def book_appointment(public_token: str, data: PublicBookingRequest, db: Session = Depends(get_db)):
    """El paciente agenda su propia cita desde el portal público, sin login.
    Reutiliza el patient_id y el nutricionista (user_id) ya asociados al plan
    compartido — no puede agendar a nombre de otro paciente."""
    plan = db.query(Plan).filter(Plan.public_token == public_token).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Enlace no válido o expirado")
    if not plan.patient_id:
        raise HTTPException(status_code=400, detail="Este plan no está vinculado a un paciente registrado")

    now = datetime.utcnow()
    scheduled_at = _naive(data.scheduled_at)
    if scheduled_at <= now:
        raise HTTPException(status_code=400, detail="Elige una fecha y hora futura")
    if scheduled_at > now + timedelta(days=BOOKING_WINDOW_DAYS):
        raise HTTPException(status_code=400, detail=f"Solo se puede agendar dentro de los próximos {BOOKING_WINDOW_DAYS} días")

    new_start = scheduled_at
    new_end = scheduled_at + timedelta(minutes=BOOKING_DURATION_MINUTES)
    existing = (
        db.query(Appointment)
        .filter(Appointment.user_id == plan.user_id, Appointment.status == "scheduled")
        .all()
    )
    for appt in existing:
        existing_start = _naive(appt.scheduled_at)
        existing_end = existing_start + timedelta(minutes=appt.duration_minutes)
        if new_start < existing_end and existing_start < new_end:
            raise HTTPException(status_code=409, detail="Ese horario ya no está disponible, elige otro")

    patient = db.query(Patient).filter(Patient.id == plan.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    appt = Appointment(
        user_id=plan.user_id,
        patient_id=plan.patient_id,
        scheduled_at=scheduled_at,
        duration_minutes=BOOKING_DURATION_MINUTES,
        notes=data.notes or "Agendada por el paciente desde el portal",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    fecha_str = appt.scheduled_at.strftime("%d/%m/%Y a las %H:%M")

    if patient.email:
        html = render_branded_email(
            "Tu cita fue agendada ✅",
            f"""<p style="color:#6b6584;font-size:14px;margin-bottom:16px;">
                Tu cita quedó agendada para el <b>{fecha_str}</b> ({BOOKING_DURATION_MINUTES} min).
            </p>""",
        )
        send_email(patient.email, "Cita confirmada — NutriElite", html)

    nutritionist = db.query(User).filter(User.id == plan.user_id).first()
    profile = db.query(NutritionistProfile).filter(NutritionistProfile.user_id == plan.user_id).first()
    notify_email = (profile.email if profile and profile.email else None) or (nutritionist.email if nutritionist else None)
    if notify_email:
        html = render_branded_email(
            "Nueva cita agendada por un paciente",
            f"""<p style="color:#6b6584;font-size:14px;margin-bottom:16px;">
                <b>{patient.name}</b> agendó una cita para el <b>{fecha_str}</b> ({BOOKING_DURATION_MINUTES} min)
                desde su portal.
            </p>""",
        )
        send_email(notify_email, "Nueva cita agendada — NutriElite", html)

    return {"id": appt.id, "scheduled_at": appt.scheduled_at, "duration_minutes": appt.duration_minutes}
