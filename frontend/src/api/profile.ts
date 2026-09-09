import { api } from './client'
import type { NutritionistProfile } from '../types'

export async function getProfile() {
  const { data } = await api.get<NutritionistProfile>('/profile')
  return data
}

export async function saveProfile(payload: NutritionistProfile) {
  const { data } = await api.post('/profile', payload)
  return data
}
