import { api } from './client'
import type { WeeklyMenu } from '../types'

export interface PublicPlan {
  patient_first_name: string
  goal_label: string
  get: number | null
  weekly_menu: WeeklyMenu
  shopping_list: { alimento: string; cantidad_g_total: number; veces_usado: number }[]
}

export async function getPublicPlan(token: string) {
  const { data } = await api.get<PublicPlan>(`/public/plans/${token}`)
  return data
}
