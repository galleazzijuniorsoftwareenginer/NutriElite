import { api } from './client'

export async function startCheckout() {
  const { data } = await api.post<{ url: string }>('/stripe/checkout')
  return data
}

export async function proStatus() {
  const { data } = await api.get<{ is_pro: boolean }>('/stripe/status')
  return data
}
