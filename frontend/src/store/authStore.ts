import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'professional' | 'student'

interface AuthState {
  token: string | null
  username: string | null
  isPro: boolean
  firstLogin: boolean
  role: UserRole
  setSession: (token: string, username: string) => void
  setProfile: (isPro: boolean, firstLogin: boolean, role?: UserRole) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isPro: false,
      firstLogin: false,
      role: 'professional',
      setSession: (token, username) => set({ token, username }),
      setProfile: (isPro, firstLogin, role) => set({ isPro, firstLogin, ...(role ? { role } : {}) }),
      logout: () => set({ token: null, username: null, isPro: false, firstLogin: false, role: 'professional' }),
    }),
    { name: 'nutrielite-auth' }
  )
)
