from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, User, ClinicalRecord, Consultation, RenalAssessment, Plan, FoodLogEntry
from backend.schemas.food_log import FoodLogEntryResponse
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
from backend.services.anthropometry_service import calculate_body_fat_jp3
from pydantic import BaseModel

router = APIRouter()


def _process_consultation_payload(payload: dict) -> dict:
    """Saca los campos transitorios (edad/sexo de la medición, no son
    columnas) y calcula % de grasa por Jackson-Pollock 3 sitios si vinieron
    pliegues pero no un % de grasa manual (bioimpedancia)."""
    edad = payload.pop("edad_medicion", None)
    sexo = payload.pop("sexo_medicion", None)

    if payload.get("grasa_corporal_pct") is None and edad and sexo:
        sexo = sexo.lower()
        if sexo == "male":
            folds = [payload.get("pliegue_pecho"), payload.get("pliegue_abdominal"), payload.get("pliegue_muslo")]
        else:
            folds = [payload.get("pliegue_triceps"), payload.get("pliegue_suprailiaco"), payload.get("pliegue_muslo")]
        if all(f is not None for f in folds):
            payload["grasa_corporal_pct"] = calculate_body_fat_jp3(sum(folds), edad, sexo)
            payload["grasa_corporal_metodo"] = "pliegues_jp3"

    return payload


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


def _validate_plan_ownership(plan_id: int | None, user_id: int, db: Session) -> None:
    """El plan_id de una Consultation es opcional (solo referencia informativa
    de qué plan estaba vigente), pero sin esta validación cualquier usuario
    podía ligar su consulta al plan_id de OTRO nutricionista con solo
    adivinar/probar IDs consecutivos."""
    if plan_id is None:
        return
    owned = db.query(Plan.id).filter(Plan.id == plan_id, Plan.user_id == user_id).first()
    if not owned:
        raise HTTPException(status_code=404, detail="Plan não encontrado")


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
    patient = _get_owned_patient(patient_id, db, token)
    payload = data.model_dump()
    _validate_plan_ownership(payload.get("plan_id"), patient.user_id, db)
    bioquimicos = payload.pop("bioquimicos", None)
    signos_vitales = payload.pop("signos_vitales", None)
    payload = _process_consultation_payload(payload)
    if payload.get("carga_enfermedad_aguda") is not None:
        payload["carga_enfermedad_aguda"] = int(payload["carga_enfermedad_aguda"])
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
    _validate_plan_ownership(payload.get("plan_id"), user.id, db)
    payload["bioquimicos"] = payload.get("bioquimicos") or []
    payload = _process_consultation_payload(payload)
    if payload.get("carga_enfermedad_aguda") is not None:
        payload["carga_enfermedad_aguda"] = int(payload["carga_enfermedad_aguda"])
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


# ---------- CRIBA DE DESNUTRICIÓN (GLIM) ----------
@router.get("/patients/{patient_id}/glim-assessment")
def get_glim_assessment(
    patient_id: int,
    age: int | None = None,
    height_cm: float | None = None,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Calcula la criba GLIM a partir de la consulta más reciente y el
    historial de peso — no persiste nada, se recalcula en cada consulta a la
    ficha. age/height_cm pueden pasarse como override; por defecto se toman
    de la talla registrada en consultas y de la edad del plan más reciente."""
    _get_owned_patient(patient_id, db, token)
    consultations = (
        db.query(Consultation)
        .filter(Consultation.patient_id == patient_id)
        .order_by(Consultation.fecha.desc())
        .all()
    )
    if not consultations:
        raise HTTPException(status_code=404, detail="No hay consultas registradas para calcular GLIM")

    latest = consultations[0]

    if height_cm is None:
        height_cm = next((c.talla for c in consultations if c.talla), None)

    if age is None:
        latest_plan = (
            db.query(Plan)
            .filter(Plan.patient_id == patient_id)
            .order_by(Plan.created_at.desc())
            .first()
        )
        age = latest_plan.age if latest_plan else None

    from backend.services.glim_service import calculate_glim

    weight_history = [(c.fecha, c.peso) for c in consultations[1:] if c.peso]
    result = calculate_glim(
        weight_history=weight_history,
        current_weight=latest.peso,
        height_cm=height_cm,
        age=age,
        ingesta_reducida=latest.ingesta_reducida,
        carga_enfermedad_aguda=bool(latest.carga_enfermedad_aguda),
        current_date=latest.fecha,
    )
    result["based_on_consultation_id"] = latest.id
    result["age_used"] = age
    result["height_cm_used"] = height_cm
    return result


# ---------- DIARIO ALIMENTARIO (vista del nutricionista) ----------
@router.get("/patients/{patient_id}/food-log", response_model=list[FoodLogEntryResponse])
def list_food_log_entries_for_nutritionist(
    patient_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)
):
    _get_owned_patient(patient_id, db, token)
    return (
        db.query(FoodLogEntry)
        .filter(FoodLogEntry.patient_id == patient_id)
        .order_by(FoodLogEntry.created_at.desc())
        .limit(100)
        .all()
    )


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
            height_cm=data.height_cm,
            gender=data.gender,
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
        height_cm=data.height_cm,
        gender=data.gender,
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
