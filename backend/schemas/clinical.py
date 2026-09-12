from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClinicalRecordUpdate(BaseModel):
    antecedentes_heredofamiliares: Optional[str] = ""
    antecedentes_patologicos: Optional[str] = ""
    antecedentes_no_patologicos: Optional[str] = ""
    alergias: Optional[str] = ""
    medicamentos_actuales: Optional[str] = ""


class ClinicalRecordResponse(ClinicalRecordUpdate):
    id: int
    patient_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LabValue(BaseModel):
    nombre: str
    valor: str
    unidad: Optional[str] = ""


class VitalSigns(BaseModel):
    presion_arterial: Optional[str] = ""
    frecuencia_cardiaca: Optional[str] = ""
    frecuencia_respiratoria: Optional[str] = ""
    temperatura: Optional[str] = ""


class ConsultationCreate(BaseModel):
    motivo_consulta: Optional[str] = ""
    peso: Optional[float] = None
    talla: Optional[float] = None
    bioquimicos: Optional[List[LabValue]] = []
    signos_vitales: Optional[VitalSigns] = None
    exploracion_fisica: Optional[str] = ""
    habitos_dieteticos: Optional[str] = ""
    diagnostico_nutricional: Optional[str] = ""
    plan_objetivos: Optional[str] = ""
    evolucion: Optional[str] = ""
    plan_id: Optional[int] = None
    # Pliegues cutáneos (adipómetro, mm) — protocolo Jackson-Pollock 3 sitios
    pliegue_pecho: Optional[float] = None
    pliegue_abdominal: Optional[float] = None
    pliegue_triceps: Optional[float] = None
    pliegue_suprailiaco: Optional[float] = None
    pliegue_muslo: Optional[float] = None
    # % grasa: se puede mandar directo (bioimpedancia) o se calcula de los pliegues
    grasa_corporal_pct: Optional[float] = None
    grasa_corporal_metodo: Optional[str] = None  # bioimpedancia|pliegues_jp3
    # Solo para calcular JP3 a partir de los pliegues — no se persisten
    edad_medicion: Optional[int] = None
    sexo_medicion: Optional[str] = None
    # Insumos GLIM (criterio etiológico)
    ingesta_reducida: Optional[str] = None  # no|leve|severa
    carga_enfermedad_aguda: Optional[bool] = None


class ConsultationResponse(BaseModel):
    id: int
    patient_id: int
    plan_id: Optional[int] = None
    fecha: datetime
    motivo_consulta: Optional[str] = None
    peso: Optional[float] = None
    talla: Optional[float] = None
    bioquimicos: Optional[list] = None
    signos_vitales: Optional[dict] = None
    exploracion_fisica: Optional[str] = None
    habitos_dieteticos: Optional[str] = None
    diagnostico_nutricional: Optional[str] = None
    plan_objetivos: Optional[str] = None
    evolucion: Optional[str] = None
    pliegue_pecho: Optional[float] = None
    pliegue_abdominal: Optional[float] = None
    pliegue_triceps: Optional[float] = None
    pliegue_suprailiaco: Optional[float] = None
    pliegue_muslo: Optional[float] = None
    grasa_corporal_pct: Optional[float] = None
    grasa_corporal_metodo: Optional[str] = None
    ingesta_reducida: Optional[str] = None
    carga_enfermedad_aguda: Optional[bool] = None

    class Config:
        from_attributes = True


class RenalAssessmentCreate(BaseModel):
    ckd_stage: str  # "1","2","3a","3b","4","5"
    dialysis_modality: str = "none"  # none|hemodialysis|peritoneal
    weight: float
    age: Optional[int] = None
    potassium_meq_l: Optional[float] = None
    phosphorus_mg_dl: Optional[float] = None
    albumin_g_dl: Optional[float] = None
    egfr: Optional[float] = None
    consultation_id: Optional[int] = None
    height_cm: Optional[float] = None
    gender: Optional[str] = None  # male|female — habilita el ajuste de peso por obesidad


class RenalAssessmentResponse(BaseModel):
    id: int
    patient_id: int
    consultation_id: Optional[int] = None
    ckd_stage: str
    dialysis_modality: str
    weight: float
    age: Optional[int] = None
    potassium_meq_l: Optional[float] = None
    phosphorus_mg_dl: Optional[float] = None
    albumin_g_dl: Optional[float] = None
    egfr: Optional[float] = None
    height_cm: Optional[float] = None
    gender: Optional[str] = None
    dosing_weight_kg: Optional[float] = None
    kcal_per_kg: float
    kcal_total: float
    protein_g_per_kg: float
    protein_g_total: float
    sodium_mg: float
    potassium_mg: float
    phosphorus_mg: float
    fluid_ml: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
