export interface ClinicalRecord {
  id: number
  patient_id: number
  antecedentes_heredofamiliares: string
  antecedentes_patologicos: string
  antecedentes_no_patologicos: string
  alergias: string
  medicamentos_actuales: string
  updated_at?: string
}

export interface LabValue {
  nombre: string
  valor: string
  unidad?: string
}

export interface VitalSigns {
  presion_arterial?: string
  frecuencia_cardiaca?: string
  frecuencia_respiratoria?: string
  temperatura?: string
}

export interface Consultation {
  id: number
  patient_id: number
  plan_id: number | null
  fecha: string
  motivo_consulta: string
  peso: number | null
  talla: number | null
  bioquimicos: LabValue[]
  signos_vitales: VitalSigns | null
  exploracion_fisica: string
  habitos_dieteticos: string
  diagnostico_nutricional: string
  plan_objetivos: string
  evolucion: string
}

export type CkdStage = '1' | '2' | '3a' | '3b' | '4' | '5'
export type DialysisModality = 'none' | 'hemodialysis' | 'peritoneal'

export interface RenalAssessmentRequest {
  ckd_stage: CkdStage
  dialysis_modality: DialysisModality
  weight: number
  age?: number | null
  potassium_meq_l?: number | null
  phosphorus_mg_dl?: number | null
  albumin_g_dl?: number | null
  egfr?: number | null
  consultation_id?: number | null
}

export interface RenalAssessment extends RenalAssessmentRequest {
  id: number
  patient_id: number
  kcal_per_kg: number
  kcal_total: number
  protein_g_per_kg: number
  protein_g_total: number
  sodium_mg: number
  potassium_mg: number
  phosphorus_mg: number
  fluid_ml: number | null
  notes: string
  created_at: string
}
