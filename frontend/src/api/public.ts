import { api } from './client'
import type { WeeklyMenu } from '../types'

export interface PublicPlan {
  patient_first_name: string
  goal_label: string
  get: number | null
  weekly_menu: WeeklyMenu
  shopping_list: { alimento: string; cantidad_g_total: number; veces_usado: number }[]
  can_book: boolean
  can_log_food: boolean
}

export interface FoodLogEntry {
  id: number
  patient_id: number
  plan_id: number | null
  tiempo_comida: string
  descripcion: string
  created_at: string
}

export interface BusySlot {
  scheduled_at: string
  duration_minutes: number
}

export async function getPublicPlan(token: string) {
  const { data } = await api.get<PublicPlan>(`/public/plans/${token}`)
  return data
}

export async function getBusySlots(token: string) {
  const { data } = await api.get<BusySlot[]>(`/public/plans/${token}/busy-slots`)
  return data
}

export async function bookPublicAppointment(token: string, scheduledAt: string, notes?: string) {
  const { data } = await api.post<{ id: number; scheduled_at: string; duration_minutes: number }>(
    `/public/plans/${token}/appointments`,
    { scheduled_at: scheduledAt, notes: notes || '' }
  )
  return data
}

export async function getPublicFoodLog(token: string) {
  const { data } = await api.get<FoodLogEntry[]>(`/public/plans/${token}/food-log`)
  return data
}

export async function createPublicFoodLogEntry(token: string, tiempoComida: string, descripcion: string) {
  const { data } = await api.post<FoodLogEntry>(`/public/plans/${token}/food-log`, {
    tiempo_comida: tiempoComida,
    descripcion,
  })
  return data
}
