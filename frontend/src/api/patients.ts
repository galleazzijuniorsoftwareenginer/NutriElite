import { api } from './client'
import type { Patient, PatientStatus } from '../types'

export interface PatientPayload {
  name: string
  email?: string
  phone?: string
  status?: PatientStatus
  notas_generales?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  blood_type?: string
  activity_category?: string
  activity_type?: string
  etiquetas?: string[]
  timezone?: string
  country?: string
  phone_country_code?: string
  address?: string
  residence_place?: string
  education_level?: string
  marital_status?: string
  children_count?: number | null
}

export async function listPatients(params?: {
  status?: string
  sort?: string
  etiqueta?: string
  app?: 'activada' | 'desactivada'
  plan_hasta?: string
}) {
  const { data } = await api.get<Patient[]>('/patients', { params })
  return data
}

export async function createPatient(payload: PatientPayload) {
  const { data } = await api.post<Patient>('/patients', payload)
  return data
}

export async function updatePatient(id: number, payload: PatientPayload) {
  const { data } = await api.put<Patient>(`/patients/${id}`, payload)
  return data
}

export async function deletePatient(id: number) {
  const { data } = await api.delete(`/patients/${id}`)
  return data
}

export async function getPatientPlans(id: number) {
  const { data } = await api.get(`/patients/${id}/plans`)
  return data
}

export async function sendPatientMessage(id: number, payload: { subject: string; body: string }) {
  const { data } = await api.post<{ ok: boolean }>(`/patients/${id}/send-message`, payload)
  return data
}

export async function getPatientInsights(id: number) {
  const { data } = await api.post<{ insight: string }>(`/patients/${id}/insights`)
  return data
}
