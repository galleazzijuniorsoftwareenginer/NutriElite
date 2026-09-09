import { api } from './client'

export interface BmrFormula {
  nombre: string
  cuando_usar: string
  formula_hombre: string
  formula_mujer: string
}

export interface ActivityMultiplier {
  nivel: string
  factor: number
  descripcion: string
}

export interface SmaeGroupGuide {
  grupo: string
  rol: string
}

export interface KdoqiSummaryRow {
  etapa: string
  tfg: string
  proteina_g_kg: string
  nota: string
}

export interface ReferenceGuide {
  bmr_formulas: BmrFormula[]
  activity_multipliers: ActivityMultiplier[]
  smae_groups_guide: SmaeGroupGuide[]
  kdoqi_summary: KdoqiSummaryRow[]
}

export async function getReferenceGuide() {
  const { data } = await api.get<ReferenceGuide>('/reference/guide')
  return data
}
