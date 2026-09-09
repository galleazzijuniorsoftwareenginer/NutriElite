import { api } from './client'
import type { Patient } from '../types'

export interface PatientPayload {
  name: string
  email?: string
  phone?: string
}

export async function listPatients() {
  const { data } = await api.get<Patient[]>('/patients')
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
