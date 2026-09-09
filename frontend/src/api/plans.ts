import { api } from './client'
import type { AuditResponse, PlanCreateResponse, PlanRequest, PlanSummary, PlanTemplate } from '../types'

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
