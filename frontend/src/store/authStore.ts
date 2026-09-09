import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  isPro: boolean
  firstLogin: boolean
  setSession: (token: string, username: string) => void
  setProfile: (isPro: boolean, firstLogin: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isPro: false,
      firstLogin: false,
      setSession: (token, username) => set({ token, username }),
      setProfile: (isPro, firstLogin) => set({ isPro, firstLogin }),
      logout: () => set({ token: null, username: null, isPro: false, firstLogin: false }),
    }),
    { name: 'nutrielite-auth' }
  )
)
