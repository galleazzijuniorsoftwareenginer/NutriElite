from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
router = APIRouter()
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
import logging

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"

if SECRET_KEY == "supersecretkey":
    logging.getLogger("uvicorn.error").warning(
        "JWT_SECRET_KEY não configurado — usando valor default inseguro. "
        "Defina a env var JWT_SECRET_KEY em produção."
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRegister(BaseModel):
    username: str
    password: str
    email: str = None
    role: str = "professional"  # professional|student

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class AccountDeleteConfirm(BaseModel):
    password: str

class AccountSettingsUpdate(BaseModel):
    email_reminders_enabled: Optional[bool] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None

def hash_password(password: str):
    password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_token_str(token: str) -> dict:
    """Mesma verificação de verify_token, mas para quando o token não vem no
    header Authorization (ex: EventSource de SSE, que não permite headers
    customizados e por isso manda o token via query string)."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.username == user.username).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    if user.role not in ("professional", "student"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    hashed = hash_password(user.password)

    new_user = User(
        username=user.username,
        password=hashed,
        email=user.email,
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user.role == "student":
        from backend.services.student_service import seed_practice_patients
        seed_practice_patients(db, new_user.id)

    return {"message": "User created successfully"}

@router.get("/me")
def get_me(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    first = bool(user.first_login)
    if first:
        user.first_login = 0
        db.commit()
    return {
        "username": user.username,
        "is_pro": bool(user.is_pro),
        "first_login": first,
        "role": user.role or "professional",
        "email_reminders_enabled": user.email_reminders_enabled if user.email_reminders_enabled is not None else True,
        "locale": user.locale or "es",
        "timezone": user.timezone or "America/Mexico_City",
    }

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.username == user.username).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": db_user.username})

    return {"access_token": token}


@router.post("/change-password")
def change_password(payload: ChangePassword, token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, user.password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada"}


@router.put("/account/settings")
def update_account_settings(payload: AccountSettingsUpdate, token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    return {
        "email_reminders_enabled": user.email_reminders_enabled,
        "locale": user.locale,
        "timezone": user.timezone,
    }


@router.get("/export-data")
def export_data(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    from backend.models import Patient, Plan, Appointment, ClinicalRecord, Consultation, RenalAssessment

    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    patients = db.query(Patient).filter(Patient.user_id == user.id).all()
    patient_ids = [p.id for p in patients]
    plans = db.query(Plan).filter(Plan.user_id == user.id).all()
    appointments = db.query(Appointment).filter(Appointment.user_id == user.id).all()
    clinical_records = db.query(ClinicalRecord).filter(ClinicalRecord.patient_id.in_(patient_ids)).all() if patient_ids else []
    consultations = db.query(Consultation).filter(Consultation.patient_id.in_(patient_ids)).all() if patient_ids else []
    renal = db.query(RenalAssessment).filter(RenalAssessment.patient_id.in_(patient_ids)).all() if patient_ids else []

    def row(obj, fields):
        return {f: getattr(obj, f) for f in fields}

    return {
        "usuario": {"username": user.username, "email": user.email, "role": user.role},
        "pacientes": [row(p, ["id", "name", "email", "phone", "status", "notas_generales", "created_at"]) for p in patients],
        "planes": [row(p, ["id", "patient_id", "patient_name", "goal", "weight", "height", "age", "gender", "tmb", "get", "protein", "carbs", "fats", "weekly_menu", "created_at"]) for p in plans],
        "citas": [row(a, ["id", "patient_id", "scheduled_at", "duration_minutes", "status", "notes"]) for a in appointments],
        "fichas_clinicas": [row(c, ["id", "patient_id"]) for c in clinical_records],
        "consultas": [row(c, ["id", "patient_id", "fecha", "peso", "bioquimicos"]) for c in consultations],
        "evaluaciones_renales": [row(r, ["id", "patient_id", "created_at"]) for r in renal],
    }


@router.delete("/account")
def delete_account(payload: AccountDeleteConfirm, token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    from backend.models import (
        Patient, Plan, PlanFoodGroup, ClinicalRecord, Consultation, RenalAssessment,
        Appointment, Recipe, RecipeFavorite, Classroom, ClassroomEnrollment,
        PlanPreferences, NutritionistProfile,
    )

    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")

    uid = user.id
    patient_ids = [p.id for p in db.query(Patient.id).filter(Patient.user_id == uid).all()]
    plan_ids = [p.id for p in db.query(Plan.id).filter(Plan.user_id == uid).all()]
    classroom_ids = [c.id for c in db.query(Classroom.id).filter(Classroom.professor_user_id == uid).all()]

    if patient_ids:
        db.query(RenalAssessment).filter(RenalAssessment.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Consultation).filter(Consultation.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(ClinicalRecord).filter(ClinicalRecord.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Appointment).filter(Appointment.patient_id.in_(patient_ids)).delete(synchronize_session=False)
    if plan_ids:
        db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id.in_(plan_ids)).delete(synchronize_session=False)

    db.query(Appointment).filter(Appointment.user_id == uid).delete(synchronize_session=False)
    db.query(Plan).filter(Plan.user_id == uid).delete(synchronize_session=False)
    db.query(Patient).filter(Patient.user_id == uid).delete(synchronize_session=False)
    db.query(RecipeFavorite).filter(RecipeFavorite.user_id == uid).delete(synchronize_session=False)
    db.query(Recipe).filter(Recipe.created_by == uid).delete(synchronize_session=False)
    if classroom_ids:
        db.query(ClassroomEnrollment).filter(ClassroomEnrollment.classroom_id.in_(classroom_ids)).delete(synchronize_session=False)
    db.query(ClassroomEnrollment).filter(ClassroomEnrollment.student_user_id == uid).delete(synchronize_session=False)
    db.query(Classroom).filter(Classroom.professor_user_id == uid).delete(synchronize_session=False)
    db.query(PlanPreferences).filter(PlanPreferences.user_id == uid).delete(synchronize_session=False)
    db.query(NutritionistProfile).filter(NutritionistProfile.user_id == uid).delete(synchronize_session=False)
    db.query(User).filter(User.id == uid).delete(synchronize_session=False)
    db.commit()

    return {"message": "Cuenta eliminada"}

