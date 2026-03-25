from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import NutritionistProfile, User
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

class ProfileData(BaseModel):
    nombre: Optional[str] = ""
    cedula: Optional[str] = ""
    especialidad: Optional[str] = ""
    clinica: Optional[str] = ""
    telefono: Optional[str] = ""
    email: Optional[str] = ""
    logo_base64: Optional[str] = ""

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    profile = db.query(NutritionistProfile).filter(NutritionistProfile.user_id == user.id).first()
    if not profile:
        return {}
    return {
        "nombre": profile.nombre,
        "cedula": profile.cedula,
        "especialidad": profile.especialidad,
        "clinica": profile.clinica,
        "telefono": profile.telefono,
        "email": profile.email,
        "logo_base64": profile.logo_base64,
    }

@router.post("/profile")
def save_profile(data: ProfileData, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    profile = db.query(NutritionistProfile).filter(NutritionistProfile.user_id == user.id).first()
    if not profile:
        profile = NutritionistProfile(user_id=user.id)
        db.add(profile)
    profile.nombre = data.nombre
    profile.cedula = data.cedula
    profile.especialidad = data.especialidad
    profile.clinica = data.clinica
    profile.telefono = data.telefono
    profile.email = data.email
    if data.logo_base64:
        profile.logo_base64 = data.logo_base64
    db.commit()
    return {"ok": True}
