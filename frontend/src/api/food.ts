import { api } from './client'
import type { FoodGroupItem } from '../types'

export async function listFoodGroups() {
  const { data } = await api.get<FoodGroupItem[]>('/food-groups')
  return data
}
