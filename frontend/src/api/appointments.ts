import { api } from './client'

export interface Appointment {
  id: number
  user_id: number
  patient_id: number
  patient_name: string
  scheduled_at: string
  duration_minutes: number
  status: string
  notes: string | null
  reminder_sent: boolean
}

export async function listAppointments(upcomingOnly = false) {
  const { data } = await api.get<Appointment[]>('/appointments', { params: { upcoming_only: upcomingOnly } })
  return data
}

export async function createAppointment(payload: { patient_id: number; scheduled_at: string; duration_minutes?: number; notes?: string }) {
  const { data } = await api.post<Appointment>('/appointments', payload)
  return data
}

export async function updateAppointment(id: number, payload: Partial<{ status: string; scheduled_at: string; notes: string }>) {
  const { data } = await api.put<Appointment>(`/appointments/${id}`, payload)
  return data
}

export async function deleteAppointment(id: number) {
  const { data } = await api.delete(`/appointments/${id}`)
  return data
}

export async function sendAppointmentReminder(id: number) {
  const { data } = await api.post(`/appointments/${id}/send-reminder`)
  return data
}
