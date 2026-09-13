from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Plan, User
from backend.routes.auth import verify_token
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PatientCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    status: Optional[str] = "activo"
    notas_generales: Optional[str] = ""
    emergency_contact_name: Optional[str] = ""
    emergency_contact_phone: Optional[str] = ""
    emergency_contact_relation: Optional[str] = ""
    blood_type: Optional[str] = ""
    activity_type: Optional[str] = ""
    activity_category: Optional[str] = ""
    etiquetas: Optional[list[str]] = []
    timezone: Optional[str] = ""
    country: Optional[str] = ""
    phone_country_code: Optional[str] = ""
    address: Optional[str] = ""
    residence_place: Optional[str] = ""
    education_level: Optional[str] = ""
    marital_status: Optional[str] = ""
    children_count: Optional[int] = None


def _patient_dict(p: Patient) -> dict:
    """Representación base del paciente (ficha básica) compartida por
    create/update/list/plans — evita repetir la lista de campos cuatro
    veces cada vez que se agrega uno nuevo."""
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "phone": p.phone,
        "status": p.status or "activo",
        "notas_generales": p.notas_generales,
        "emergency_contact_name": p.emergency_contact_name,
        "emergency_contact_phone": p.emergency_contact_phone,
        "emergency_contact_relation": p.emergency_contact_relation,
        "blood_type": p.blood_type,
        "activity_type": p.activity_type,
        "activity_category": p.activity_category,
        "etiquetas": p.etiquetas or [],
        "timezone": p.timezone,
        "country": p.country,
        "phone_country_code": p.phone_country_code,
        "address": p.address,
        "residence_place": p.residence_place,
        "education_level": p.education_level,
        "marital_status": p.marital_status,
        "children_count": p.children_count,
    }


def _apply_patient_fields(patient: Patient, data: PatientCreate) -> None:
    patient.name = data.name
    patient.email = data.email
    patient.phone = data.phone
    if data.status is not None:
        patient.status = data.status
    patient.notas_generales = data.notas_generales
    patient.emergency_contact_name = data.emergency_contact_name
    patient.emergency_contact_phone = data.emergency_contact_phone
    patient.emergency_contact_relation = data.emergency_contact_relation
    patient.blood_type = data.blood_type
    patient.activity_type = data.activity_type
    patient.activity_category = data.activity_category
    patient.etiquetas = data.etiquetas or []
    patient.timezone = data.timezone
    patient.country = data.country
    patient.phone_country_code = data.phone_country_code
    patient.address = data.address
    patient.residence_place = data.residence_place
    patient.education_level = data.education_level
    patient.marital_status = data.marital_status
    patient.children_count = data.children_count


@router.get("/patients")
def list_patients(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    status: str = None,
    sort: str = "recent",
    etiqueta: str = None,
    app: str = None,  # todos|activada|desactivada — según si el último plan tiene portal público generado
    plan_hasta: str = None,  # "YYYY-MM-DD" — solo pacientes cuyo último plan fue asignado hasta esa fecha
):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    query = db.query(Patient).filter(Patient.user_id == user.id)
    if status:
        query = query.filter(Patient.status == status)
    if sort == "name":
        query = query.order_by(Patient.name.asc())
    elif sort == "oldest":
        query = query.order_by(Patient.created_at.asc())
    else:
        query = query.order_by(Patient.created_at.desc())
    patients = query.all()

    plan_hasta_date = None
    if plan_hasta:
        try:
            plan_hasta_date = datetime.strptime(plan_hasta, "%Y-%m-%d").date()
        except ValueError:
            plan_hasta_date = None

    result = []
    for p in patients:
        if etiqueta and etiqueta not in (p.etiquetas or []):
            continue
        plans = db.query(Plan).filter(Plan.patient_id == p.id).order_by(Plan.created_at.desc()).all()
        last_plan = plans[0] if plans else None

        if plan_hasta_date and (not last_plan or last_plan.created_at.date() > plan_hasta_date):
            continue

        app_activada = bool(last_plan and last_plan.public_token)
        if app == "activada" and not app_activada:
            continue
        if app == "desactivada" and app_activada:
            continue

        result.append({
            **_patient_dict(p),
            "created_at": str(p.created_at),
            "total_plans": len(plans),
            "last_plan": str(last_plan.created_at) if last_plan else None,
            "last_goal": last_plan.goal if last_plan else None,
            "last_plan_id": last_plan.id if last_plan else None,
            "app_activada": app_activada,
            "portal_last_accessed": str(last_plan.portal_last_accessed_at) if last_plan and last_plan.portal_last_accessed_at else None,
        })
    if sort == "last_plan":
        result.sort(key=lambda r: r["last_plan"] or "", reverse=True)
    return result

@router.post("/patients")
def create_patient(data: PatientCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = Patient(user_id=user.id)
    _apply_patient_fields(patient, data)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _patient_dict(patient)

@router.get("/patients/{patient_id}/plans")
def patient_plans(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    plans = db.query(Plan).filter(Plan.patient_id == patient_id).order_by(Plan.created_at.desc()).all()
    return {
        "patient": _patient_dict(patient),
        "plans": [{"id": p.id, "created_at": str(p.created_at), "goal": p.goal, "weight": p.weight, "height": p.height, "get": p.get, "tmb": p.tmb} for p in plans]
    }

@router.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    _apply_patient_fields(patient, data)
    db.commit()
    db.refresh(patient)
    return _patient_dict(patient)

@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    from backend.services.cascade_delete import delete_patient_dependents
    delete_patient_dependents(db, patient_id)
    db.delete(patient)
    db.commit()
    return {"ok": True}


class PatientMessage(BaseModel):
    subject: str
    body: str


@router.post("/patients/{patient_id}/send-message")
def send_patient_message(patient_id: int, data: PatientMessage, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Envía un correo directo al paciente desde 'Acciones' en su ficha —
    reutiliza el mismo servicio de email que las citas y el reset de
    contraseña, sin agregar un canal nuevo."""
    import html as html_lib
    from backend.services.email_service import send_email, render_branded_email, is_valid_email

    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    if not is_valid_email(patient.email):
        raise HTTPException(status_code=400, detail="Este paciente no tiene un email válido registrado")

    safe_subject = html_lib.escape(data.subject)
    safe_body = html_lib.escape(data.body)
    html = render_branded_email(safe_subject, f'<p style="color:#6b6584;font-size:14px;white-space:pre-line;">{safe_body}</p>')
    sent = send_email(patient.email, data.subject, html)
    if not sent:
        raise HTTPException(status_code=502, detail="No se pudo enviar el correo — intenta de nuevo en un momento")
    return {"ok": True}


@router.post("/patients/{patient_id}/insights")
def get_patient_insights(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    """Nota corta con IA sobre la evolución del paciente (tendencia de peso
    y sugerencia para la próxima consulta) — se genera bajo demanda, no se
    guarda, para no gastar tokens si el nutricionista no la pide."""
    from backend.services.patient_insights_service import generate_patient_insights

    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")

    plans = db.query(Plan).filter(Plan.patient_id == patient_id).order_by(Plan.created_at.asc()).all()
    plans_data = [{"created_at": str(p.created_at), "weight": p.weight, "goal": p.goal, "get": p.get} for p in plans]
    insight = generate_patient_insights(patient.name, plans_data)
    return {"insight": insight}
