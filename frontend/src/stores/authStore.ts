import { create } from "zustand"
import { persist } from "zustand/middleware"

import users from "@/mocks/users.json"
import type { User, UserRole } from "@/types"

// Accounts made through sign-up. Mock only: they live in this browser's localStorage,
// password included, until Supabase auth takes over.
type Account = User & { password: string }

type SignupDetails = {
  name: string
  email: string
  password: string
  role: UserRole
}

type AuthState = {
  user: User | null
  accounts: Account[]
  login: (email: string, password: string) => User | null
  // Returns null if the email is already taken.
  signup: (details: SignupDetails) => User | null
  logout: () => void
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function toUser({ id, name, email, role }: Account): User {
  return { id, name, email, role }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: [],
      login: (email, password) => {
        const all = [...(users as Account[]), ...get().accounts]
        const match = all.find((account) => sameEmail(account.email, email) && account.password === password)
        if (!match) return null

        const user = toUser(match)
        set({ user })
        return user
      },
      signup: ({ name, email, password, role }) => {
        const taken = [...(users as Account[]), ...get().accounts].some((account) =>
          sameEmail(account.email, email)
        )
        if (taken) return null

        const account: Account = {
          id: `u-${crypto.randomUUID().slice(0, 8)}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }
        const user = toUser(account)
        set((state) => ({ accounts: [...state.accounts, account], user }))
        return user
      },
      logout: () => set({ user: null }),
    }),
    { name: "syncspace-auth" }
  )
)
