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

@router.get("/patients")
def list_patients(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    status: str = None,
    sort: str = "recent",
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
    result = []
    for p in patients:
        plans = db.query(Plan).filter(Plan.patient_id == p.id).order_by(Plan.created_at.desc()).all()
        result.append({
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
            "created_at": str(p.created_at),
            "total_plans": len(plans),
            "last_plan": str(plans[0].created_at) if plans else None,
            "last_goal": plans[0].goal if plans else None,
            "last_plan_id": plans[0].id if plans else None,
        })
    if sort == "last_plan":
        result.sort(key=lambda r: r["last_plan"] or "", reverse=True)
    return result

@router.post("/patients")
def create_patient(data: PatientCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = Patient(
        name=data.name,
        email=data.email,
        phone=data.phone,
        status=data.status or "activo",
        notas_generales=data.notas_generales,
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        emergency_contact_relation=data.emergency_contact_relation,
        blood_type=data.blood_type,
        activity_type=data.activity_type,
        activity_category=data.activity_category,
        user_id=user.id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "status": patient.status,
        "notas_generales": patient.notas_generales,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "emergency_contact_relation": patient.emergency_contact_relation,
        "blood_type": patient.blood_type,
        "activity_type": patient.activity_type,
        "activity_category": patient.activity_category,
    }

@router.get("/patients/{patient_id}/plans")
def patient_plans(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    plans = db.query(Plan).filter(Plan.patient_id == patient_id).order_by(Plan.created_at.desc()).all()
    return {
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "email": patient.email,
            "phone": patient.phone,
            "status": patient.status,
            "notas_generales": patient.notas_generales,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "emergency_contact_relation": patient.emergency_contact_relation,
            "blood_type": patient.blood_type,
            "activity_type": patient.activity_type,
            "activity_category": patient.activity_category,
        },
        "plans": [{"id": p.id, "created_at": str(p.created_at), "goal": p.goal, "weight": p.weight, "height": p.height, "get": p.get, "tmb": p.tmb} for p in plans]
    }

@router.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
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
    db.commit()
    db.refresh(patient)
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "status": patient.status,
        "notas_generales": patient.notas_generales,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "emergency_contact_relation": patient.emergency_contact_relation,
        "blood_type": patient.blood_type,
        "activity_type": patient.activity_type,
        "activity_category": patient.activity_category,
    }

@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    db.delete(patient)
    db.commit()
    return {"ok": True}
