import { api } from './client'

export interface MeResponse {
  username: string
  is_pro: boolean
  first_login: boolean
}

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string }>('/login', { username, password })
  return data
}

export async function register(username: string, password: string, email?: string) {
  const { data } = await api.post('/register', { username, password, email: email || null })
  return data
}

export async function me() {
  const { data } = await api.get<MeResponse>('/me')
  return data
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/reset-password', { token, password })
  return data
}
