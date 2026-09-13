import { api } from './client'
import type { AuditResponse, MealSlot, MicronutrientResult, PlanCreateResponse, PlanRequest, PlanSummary, PlanTemplate, RecipeMatchResult } from '../types'

export async function createPlan(payload: PlanRequest) {
  const { data } = await api.post<PlanCreateResponse>('/plan', payload)
  return data
}

export async function listPlans(goal?: string) {
  const { data } = await api.get<PlanSummary[]>('/plans', { params: goal ? { goal } : undefined })
  return data
}

export async function getPlan(planId: number) {
  const { data } = await api.get(`/plans/${planId}`)
  return data
}

export async function deletePlan(planId: number) {
  const { data } = await api.delete(`/plans/${planId}`)
  return data
}

export interface MacroOverride {
  protein_g: number
  carbs_g: number
  fats_g: number
}

export async function getAudit(planId: number, override?: MacroOverride) {
  const { data } = await api.get<AuditResponse>(`/plans/${planId}/audit`, {
    params: override,
  })
  return data
}

export function pdfDownloadUrl(planId: number, params: {
  menu?: unknown
  perfil?: unknown
  override?: MacroOverride
}) {
  const qs = new URLSearchParams()
  if (params.menu) qs.set('menu', JSON.stringify(params.menu))
  if (params.perfil) qs.set('perfil', JSON.stringify(params.perfil))
  if (params.override) {
    qs.set('protein_g', params.override.protein_g.toFixed(1))
    qs.set('carbs_g', params.override.carbs_g.toFixed(1))
    qs.set('fats_g', params.override.fats_g.toFixed(1))
  }
  const query = qs.toString()
  return `/plans/${planId}/pdf${query ? `?${query}` : ''}`
}

export async function getMicronutrients(planId: number) {
  const { data } = await api.get<MicronutrientResult>(`/plans/${planId}/menu/micronutrients`)
  return data
}

export function micronutrientsXlsxUrl(planId: number) {
  return `/plans/${planId}/menu/micronutrients/xlsx`
}

export async function getRecipeMatches(planId: number) {
  const { data } = await api.get<RecipeMatchResult>(`/plans/${planId}/menu/recipe-matches`)
  return data
}

export async function sharePlan(planId: number) {
  const { data } = await api.post<{ public_token: string; url: string }>(`/plans/${planId}/share`)
  return data
}

export async function saveAsTemplate(planId: number, templateName: string) {
  const { data } = await api.post(`/plans/${planId}/save-template`, null, {
    params: { template_name: templateName },
  })
  return data
}

export async function listTemplates() {
  const { data } = await api.get<PlanTemplate[]>('/templates')
  return data
}

export async function deleteTemplate(planId: number) {
  const { data } = await api.delete(`/templates/${planId}`)
  return data
}

export interface PlanConfig {
  idioma: 'es' | 'en' | 'pt'
  region: string
  restricted_ingredients: string[]
}

export async function getPlanConfig(planId: number) {
  const { data } = await api.get<PlanConfig>(`/plans/${planId}/config`)
  return data
}

export async function savePlanConfig(planId: number, config: PlanConfig) {
  const { data } = await api.put<PlanConfig>(`/plans/${planId}/config`, config)
  return data
}

export async function getMealDistribution(planId: number) {
  const { data } = await api.get<{ items: MealSlot[] }>(`/plans/${planId}/meal-distribution`)
  return data.items
}

export async function saveMealDistribution(planId: number, items: MealSlot[]) {
  const { data } = await api.put<{ items: MealSlot[] }>(`/plans/${planId}/meal-distribution`, { items })
  return data.items
}
