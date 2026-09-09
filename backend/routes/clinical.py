from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, User, ClinicalRecord, Consultation, RenalAssessment
from backend.routes.auth import verify_token
from backend.schemas.clinical import (
    ClinicalRecordUpdate,
    ClinicalRecordResponse,
    ConsultationCreate,
    ConsultationResponse,
    RenalAssessmentCreate,
    RenalAssessmentResponse,
)
from backend.services.renal_service import calculate_renal_targets
from pydantic import BaseModel

router = APIRouter()


class LabImagePayload(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_owned_patient(patient_id: int, db: Session, token: dict) -> Patient:
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado")
    return patient


# ---------- FICHA CLÍNICA ----------
@router.get("/patients/{patient_id}/clinical-record", response_model=ClinicalRecordResponse)
def get_clinical_record(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    _get_owned_patient(patient_id, db, token)
    record = db.query(ClinicalRecord).filter(ClinicalRecord.patient_id == patient_id).first()
    if not record:
        record = ClinicalRecord(patient_id=patient_id)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


@router.put("/patients/{patient_id}/clinical-record", response_model=ClinicalRecordResponse)
def update_clinical_record(
    patient_id: int,
    data: ClinicalRecordUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    _get_owned_patient(patient_id, db, token)
    record = db.query(ClinicalRecord).filter(ClinicalRecord.patient_id == patient_id).first()
    if not record:
        record = ClinicalRecord(patient_id=patient_id)
        db.add(record)
    for field, value in data.model_dump().items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


# ---------- CONSULTAS ----------
@router.get("/patients/{patient_id}/consultations", response_model=list[ConsultationResponse])
def list_consultations(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    _get_owned_patient(patient_id, db, token)
    return (
        db.query(Consultation)
        .filter(Consultation.patient_id == patient_id)
        .order_by(Consultation.fecha.desc())
        .all()
    )


@router.post("/patients/{patient_id}/consultations", response_model=ConsultationResponse)
def create_consultation(
    patient_id: int,
    data: ConsultationCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    _get_owned_patient(patient_id, db, token)
    payload = data.model_dump()
    bioquimicos = payload.pop("bioquimicos", None)
    signos_vitales = payload.pop("signos_vitales", None)
    consultation = Consultation(
        patient_id=patient_id,
        bioquimicos=[lv for lv in (bioquimicos or [])],
        signos_vitales=signos_vitales,
        **payload,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.put("/consultations/{consultation_id}", response_model=ConsultationResponse)
def update_consultation(
    consultation_id: int,
    data: ConsultationCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    consultation = (
        db.query(Consultation)
        .join(Patient, Patient.id == Consultation.patient_id)
        .filter(Consultation.id == consultation_id, Patient.user_id == user.id)
        .first()
    )
    if not consultation:
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
    payload = data.model_dump()
    payload["bioquimicos"] = payload.get("bioquimicos") or []
    for field, value in payload.items():
        setattr(consultation, field, value)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.delete("/consultations/{consultation_id}")
def delete_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    username = token["sub"]
    user = db.query(User).filter(User.username == username).first()
    consultation = (
        db.query(Consultation)
        .join(Patient, Patient.id == Consultation.patient_id)
        .filter(Consultation.id == consultation_id, Patient.user_id == user.id)
        .first()
    )
    if not consultation:
        raise HTTPException(status_code=404, detail="Consulta não encontrada")
    db.delete(consultation)
    db.commit()
    return {"ok": True}


# ---------- EXTRACCIÓN DE LABORATORIOS CON IA (revisión manual antes de guardar) ----------
@router.post("/patients/{patient_id}/consultations/extract-labs")
def extract_labs_from_image(
    patient_id: int,
    data: LabImagePayload,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    _get_owned_patient(patient_id, db, token)
    from backend.services.lab_extraction_service import extract_lab_values

    try:
        valores = extract_lab_values(data.image_base64, data.media_type)
        return {"valores": valores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo leer la imagen: {str(e)}")


# ---------- MÓDULO RENAL (KDOQI) ----------
@router.post("/patients/{patient_id}/renal-assessment", response_model=RenalAssessmentResponse)
def create_renal_assessment(
    patient_id: int,
    data: RenalAssessmentCreate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    _get_owned_patient(patient_id, db, token)
    try:
        targets = calculate_renal_targets(
            ckd_stage=data.ckd_stage,
            dialysis_modality=data.dialysis_modality,
            weight=data.weight,
            age=data.age,
            potassium_meq_l=data.potassium_meq_l,
            phosphorus_mg_dl=data.phosphorus_mg_dl,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    assessment = RenalAssessment(
        patient_id=patient_id,
        consultation_id=data.consultation_id,
        ckd_stage=data.ckd_stage,
        dialysis_modality=data.dialysis_modality,
        weight=data.weight,
        age=data.age,
        potassium_meq_l=data.potassium_meq_l,
        phosphorus_mg_dl=data.phosphorus_mg_dl,
        albumin_g_dl=data.albumin_g_dl,
        egfr=data.egfr,
        **targets,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/patients/{patient_id}/renal-assessments", response_model=list[RenalAssessmentResponse])
def list_renal_assessments(patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    _get_owned_patient(patient_id, db, token)
    return (
        db.query(RenalAssessment)
        .filter(RenalAssessment.patient_id == patient_id)
        .order_by(RenalAssessment.created_at.desc())
        .all()
    )
