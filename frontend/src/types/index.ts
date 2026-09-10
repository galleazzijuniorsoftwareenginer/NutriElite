export type Formula = 'mifflin' | 'harris' | 'schofield' | 'katch' | 'cunningham'
export type Goal = 'cut' | 'bulk' | 'maintenance'
export type Gender = 'male' | 'female'

export interface PlanRequest {
  patient_name: string
  patient_email: string
  patient_phone: string
  patient_id?: number | null
  weight: number
  height: number
  age: number
  gender: Gender
  activity_level: number
  goal: Goal
  formula: Formula
  body_fat_percent?: number | null
}

export interface PlanCreateResponse {
  plan_id: number
  TMB: number
  GET: number
  Protein_g: number
  Carbs_g: number
  Fats_g: number
}

export interface PlanSummary {
  id: number
  patient_name: string | null
  patient_id: number | null
  goal: Goal
  weight: number
  height: number
  age: number
  tmb: number
  get: number
  created_at: string
}

export type PatientStatus = 'activo' | 'inactivo' | 'pausado'

export interface Patient {
  id: number
  name: string
  email: string
  phone: string
  status: PatientStatus
  notas_generales: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  blood_type: string | null
  activity_type: string | null
  created_at: string
  total_plans: number
  last_plan: string | null
  last_goal: Goal | null
  last_plan_id: number | null
}

export interface SmaeRow {
  group: string
  subgroup: string | null
  portions: number
  kcal: number
  protein: number
  fats: number
  carbs: number
}

export interface AuditResponse {
  smae_table: SmaeRow[]
  totals: {
    kcal_from_table: number
    protein_g: number
    carbs_g: number
    fats_g: number
  }
  energy_validation: {
    kcal_from_macros: number
    get_planned: number
  }
}

export interface NutritionistProfile {
  nombre?: string
  cedula?: string
  especialidad?: string
  clinica?: string
  telefono?: string
  email?: string
  logo_base64?: string | null
}

export interface MenuItem {
  alimento: string
  quantidade_g: number
  kcal: number
}

export interface MenuMeal {
  tiempo: string
  kcal: number
  itens: MenuItem[]
}

export interface MenuDay {
  dia: string
  comidas: MenuMeal[]
  macros: {
    proteina_g: number
    carb_g: number
    gordura_g: number
    kcal_total: number
  }
  error?: string
}

export interface WeeklyMenu {
  semana: MenuDay[]
}

export interface PlanTemplate {
  id: number
  template_name: string
  goal: Goal
  weight: number
  get: number
  protein: number
  carbs: number
  fats: number
  created_at: string
}
