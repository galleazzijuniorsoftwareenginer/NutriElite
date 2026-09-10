import { api } from './client'

export interface PlanPreferences {
  default_formula: 'mifflin' | 'harris' | 'schofield'
  default_activity_level: number
  default_goal: 'cut' | 'maintenance' | 'bulk'
  protein_pct: number
  fat_pct: number
  carb_pct: number
  kcal_adjustment_cut: number
  kcal_adjustment_bulk: number
}

export async function getPlanPreferences() {
  const { data } = await api.get<PlanPreferences>('/plan-preferences')
  return data
}

export async function savePlanPreferences(payload: PlanPreferences) {
  const { data } = await api.put<PlanPreferences>('/plan-preferences', payload)
  return data
}
