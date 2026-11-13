import { create } from "zustand"
import { persist } from "zustand/middleware"

import users from "@/mocks/users.json"
import type { User, UserRole } from "@/types"

type AuthState = {
  user: User | null
  login: (email: string, password: string) => User | null
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email, password) => {
        const match = users.find(
          (u) =>
            u.email.toLowerCase() === email.trim().toLowerCase() &&
            u.password === password
        )
        if (!match) return null

        const user: User = {
          id: match.id,
          name: match.name,
          email: match.email,
          role: match.role as UserRole,
        }
        set({ user })
        return user
      },
      logout: () => set({ user: null }),
    }),
    { name: "syncspace-auth" }
  )
)
