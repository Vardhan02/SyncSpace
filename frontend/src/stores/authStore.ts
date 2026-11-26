import { create } from "zustand"
import { persist } from "zustand/middleware"

import users from "@/mocks/users.json"
import type { AuthSession, User } from "@/types"

// Settings still edits these mock copies until it's moved to the API.
type Account = Omit<User, "firstLogin"> & { password: string }

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  accounts: Account[]
  startSession: (session: AuthSession) => void
  // Return an error message, or null when it worked
  updateAccount: (details: { name: string; email: string }) => string | null
  changePassword: (current: string, next: string) => string | null
  deleteAccount: () => void
  logout: () => void
}

const mockAccounts = users as Account[]

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function toUser({ id, name, email, role }: Account): User {
  return { id, name, email, role, firstLogin: false }
}

function allAccounts(saved: Account[]) {
  return [...saved, ...mockAccounts.filter((mock) => !saved.some((account) => account.id === mock.id))]
}

const signedOut = { user: null, accessToken: null, refreshToken: null }

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      function currentAccount() {
        const id = get().user?.id
        return allAccounts(get().accounts).find((account) => account.id === id)
      }

      function save(account: Account) {
        set((state) => ({
          accounts: [...state.accounts.filter((saved) => saved.id !== account.id), account],
          user: toUser(account),
        }))
      }

      return {
        ...signedOut,
        accounts: [],
        startSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
        updateAccount: ({ name, email }) => {
          const account = currentAccount()
          if (!account) return "You're not logged in"

          const taken = allAccounts(get().accounts).some(
            (other) => other.id !== account.id && sameEmail(other.email, email)
          )
          if (taken) return "There's already an account with this email"

          save({ ...account, name: name.trim(), email: email.trim().toLowerCase() })
          return null
        },
        changePassword: (current, next) => {
          const account = currentAccount()
          if (!account) return "You're not logged in"
          if (account.password !== current) return "Your current password is wrong"

          save({ ...account, password: next })
          return null
        },
        deleteAccount: () =>
          set((state) => ({
            ...signedOut,
            accounts: state.accounts.filter((account) => account.id !== state.user?.id),
          })),
        logout: () => set(signedOut),
      }
    },
    {
      name: "syncspace-auth",
      version: 1,
      // Version 0 sessions came from the mock users and have no token
      migrate: (saved) => ({ ...(saved as AuthState), ...signedOut }),
    }
  )
)
