import { api } from './client'
import type { ClinicalRecord, Consultation, LabValue, RenalAssessment, RenalAssessmentRequest } from '../types/clinical'

export async function getClinicalRecord(patientId: number) {
  const { data } = await api.get<ClinicalRecord>(`/patients/${patientId}/clinical-record`)
  return data
}

export async function updateClinicalRecord(patientId: number, payload: Partial<ClinicalRecord>) {
  const { data } = await api.put<ClinicalRecord>(`/patients/${patientId}/clinical-record`, payload)
  return data
}

export async function listConsultations(patientId: number) {
  const { data } = await api.get<Consultation[]>(`/patients/${patientId}/consultations`)
  return data
}

export type ConsultationPayload = Omit<Consultation, 'id' | 'patient_id' | 'fecha'>

export async function createConsultation(patientId: number, payload: Partial<ConsultationPayload>) {
  const { data } = await api.post<Consultation>(`/patients/${patientId}/consultations`, payload)
  return data
}

export async function deleteConsultation(consultationId: number) {
  const { data } = await api.delete(`/consultations/${consultationId}`)
  return data
}

export async function extractLabsFromImage(patientId: number, imageBase64: string, mediaType = 'image/jpeg') {
  const { data } = await api.post<{ valores: LabValue[] }>(`/patients/${patientId}/consultations/extract-labs`, {
    image_base64: imageBase64,
    media_type: mediaType,
  })
  return data.valores
}

export async function createRenalAssessment(patientId: number, payload: RenalAssessmentRequest) {
  const { data } = await api.post<RenalAssessment>(`/patients/${patientId}/renal-assessment`, payload)
  return data
}

export async function listRenalAssessments(patientId: number) {
  const { data } = await api.get<RenalAssessment[]>(`/patients/${patientId}/renal-assessments`)
  return data
}
