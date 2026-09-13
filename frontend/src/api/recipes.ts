import { api } from './client'
import type { RecipeMicronutrientResult } from '../types'

export interface Ingredient {
  alimento: string
  cantidad_g: number
}

export interface Recipe {
  id: number
  nombre: string
  tiempo_comida: string
  goal_tags: string[] | null
  categoria_tags: string[] | null
  ingredientes: Ingredient[]
  instrucciones: string | null
  kcal_aprox: number | null
  imagen_url: string | null
  created_by: number | null
  favorito: boolean
}

export interface RecipeCreate {
  nombre: string
  tiempo_comida: string
  goal_tags?: string[]
  categoria_tags?: string[]
  ingredientes: Ingredient[]
  instrucciones?: string
  kcal_aprox?: number
}

export async function listRecipes(params?: { tiempo_comida?: string; goal?: string; categoria?: string; favoritos?: boolean; search?: string }) {
  const { data } = await api.get<Recipe[]>('/recipes', { params })
  return data
}

export async function createRecipe(payload: RecipeCreate) {
  const { data } = await api.post<Recipe>('/recipes', payload)
  return data
}

export async function deleteRecipe(recipeId: number) {
  const { data } = await api.delete(`/recipes/${recipeId}`)
  return data
}

export async function favoriteRecipe(recipeId: number) {
  const { data } = await api.post<{ ok: boolean; favorito: boolean }>(`/recipes/${recipeId}/favorite`)
  return data
}

export async function unfavoriteRecipe(recipeId: number) {
  const { data } = await api.delete<{ ok: boolean; favorito: boolean }>(`/recipes/${recipeId}/favorite`)
  return data
}

export async function getRecipeMicronutrients(recipeId: number) {
  const { data } = await api.get<RecipeMicronutrientResult>(`/recipes/${recipeId}/micronutrients`)
  return data
}

export async function generateShoppingList(semana: unknown[]) {
  const { data } = await api.post<{ items: { alimento: string; cantidad_g: number }[] }>('/shopping-list', { semana })
  return data
}
