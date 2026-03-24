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

@router.get("/patients")
def list_patients(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patients = db.query(Patient).filter(Patient.user_id == user.id).order_by(Patient.created_at.desc()).all()
    result = []
    for p in patients:
        plans = db.query(Plan).filter(Plan.patient_id == p.id).order_by(Plan.created_at.desc()).all()
        result.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "phone": p.phone,
            "created_at": str(p.created_at),
            "total_plans": len(plans),
            "last_plan": str(plans[0].created_at) if plans else None,
            "last_goal": plans[0].goal if plans else None,
        })
    return result

@router.post("/patients")
def create_patient(data: PatientCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = Patient(name=data.name, email=data.email, phone=data.phone, user_id=user.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return {"id": patient.id, "name": patient.name, "email": patient.email, "phone": patient.phone}

@router.get("/patients/{patient_id}/plans")
def patient_plans(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    plans = db.query(Plan).filter(Plan.patient_id == patient_id).order_by(Plan.created_at.desc()).all()
    return {
        "patient": {"id": patient.id, "name": patient.name, "email": patient.email, "phone": patient.phone},
        "plans": [{"id": p.id, "created_at": str(p.created_at), "goal": p.goal, "weight": p.weight, "get": p.get, "tmb": p.tmb} for p in plans]
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
    db.commit()
    db.refresh(patient)
    return {"id": patient.id, "name": patient.name, "email": patient.email, "phone": patient.phone}

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
