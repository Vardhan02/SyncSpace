import { create } from "zustand"
import { persist } from "zustand/middleware"

import users from "@/mocks/users.json"
import type { User, UserRole } from "@/types"

// Accounts made through sign-up, plus edited copies of the mock users. Mock only: they
// live in this browser's localStorage, password included, until Supabase auth takes over.
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
  // Both return an error message, or null when it worked.
  updateAccount: (details: { name: string; email: string }) => string | null
  changePassword: (current: string, next: string) => string | null
  // Removes the signed-in account and logs out. A mock user only loses its saved changes,
  // since the mock file can't be edited.
  deleteAccount: () => void
  logout: () => void
}

const mockAccounts = users as Account[]

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function toUser({ id, name, email, role }: Account): User {
  return { id, name, email, role }
}

// A saved copy wins over the mock user with the same id.
function allAccounts(saved: Account[]) {
  return [...saved, ...mockAccounts.filter((mock) => !saved.some((account) => account.id === mock.id))]
}

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
        user: null,
        accounts: [],
        login: (email, password) => {
          const match = allAccounts(get().accounts).find(
            (account) => sameEmail(account.email, email) && account.password === password
          )
          if (!match) return null

          const user = toUser(match)
          set({ user })
          return user
        },
        signup: ({ name, email, password, role }) => {
          const taken = allAccounts(get().accounts).some((account) => sameEmail(account.email, email))
          if (taken) return null

          const account: Account = {
            id: `u-${crypto.randomUUID().slice(0, 8)}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
          }
          save(account)
          return toUser(account)
        },
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
            accounts: state.accounts.filter((account) => account.id !== state.user?.id),
            user: null,
          })),
        logout: () => set({ user: null }),
      }
    },
    { name: "syncspace-auth" }
  )
)
