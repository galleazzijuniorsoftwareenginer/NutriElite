import { api } from './client'
import type { UserRole } from '../store/authStore'

export interface MeResponse {
  username: string
  is_pro: boolean
  first_login: boolean
  role: UserRole
  email_reminders_enabled: boolean
  locale: string
  timezone: string
}

export interface AccountSettings {
  email_reminders_enabled: boolean
  locale: string
  timezone: string
}

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string }>('/login', { username, password })
  return data
}

export async function register(username: string, password: string, email?: string, role: UserRole = 'professional') {
  const { data } = await api.post('/register', { username, password, email: email || null, role })
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

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.post('/change-password', { current_password: currentPassword, new_password: newPassword })
  return data
}

export async function exportData() {
  const { data } = await api.get('/export-data')
  return data
}

export async function updateAccountSettings(payload: Partial<AccountSettings>) {
  const { data } = await api.put<AccountSettings>('/account/settings', payload)
  return data
}

export async function deleteAccount(password: string) {
  const { data } = await api.delete('/account', { data: { password } })
  return data
}
