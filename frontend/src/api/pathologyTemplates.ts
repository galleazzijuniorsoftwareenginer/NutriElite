import { api } from './client'

export interface PathologyTemplateSummary {
  id: number
  nombre: string
  categoria: string
  kcal_objetivo: number
  descripcion: string | null
  tiempos_por_dia: number
  imagen_url: string | null
  total_recetas: number
}

export interface PathologyTemplateDetail extends Omit<PathologyTemplateSummary, 'total_recetas'> {
  weekly_menu: { semana: unknown[] }
}

export async function listPathologyTemplates(params?: { categoria?: string; kcal_min?: number; kcal_max?: number }) {
  const { data } = await api.get<PathologyTemplateSummary[]>('/pathology-templates', { params })
  return data
}

export async function getPathologyTemplate(templateId: number) {
  const { data } = await api.get<PathologyTemplateDetail>(`/pathology-templates/${templateId}`)
  return data
}

export async function assignPathologyTemplate(templateId: number, patientId: number) {
  const { data } = await api.post<{ plan_id: number }>(`/pathology-templates/${templateId}/assign`, { patient_id: patientId })
  return data
}
