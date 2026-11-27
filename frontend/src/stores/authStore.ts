import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AuthSession, User } from "@/types"

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  startSession: (session: AuthSession) => void
  setUser: (user: User) => void
  logout: () => void
}

const signedOut = { user: null, accessToken: null, refreshToken: null }

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...signedOut,
      startSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set(signedOut),
    }),
    {
      name: "syncspace-auth",
      version: 2,
      migrate: (saved, version) => {
        // Version 1 still kept the mock accounts, passwords included
        const { accounts: _accounts, ...state } = saved as AuthState & { accounts?: unknown }
        // Version 0 sessions came from the mock users and have no token
        return version < 1 ? { ...state, ...signedOut } : state
      },
    }
  )
)
