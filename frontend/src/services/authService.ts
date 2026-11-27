import { api } from "@/lib/api"
import type { AuthSession, UserRole } from "@/types"

export type SignupDetails = {
  name: string
  email: string
  phone: string
  password: string
  role: UserRole
  phoneVisible: boolean
}

export function login(email: string, password: string) {
  return api<AuthSession>("/auth/login", { method: "POST", body: { email, password } })
}

export function logout() {
  return api<void>("/auth/logout", { method: "POST" })
}

// null when Supabase wants the email confirmed before the first login
export async function signup(details: SignupDetails) {
  const result = await api<AuthSession | { message: string }>("/auth/signup", {
    method: "POST",
    body: details,
  })
  return "accessToken" in result ? result : null
}

// Always 204, so it can't be used to find out which emails have accounts
export function requestPasswordReset(email: string) {
  return api<void>("/auth/forgot-password", { method: "POST", body: { email } })
}

// `token` comes from the link in the reset email
export function resetPassword(token: string, password: string) {
  return api<void>("/auth/reset-password", { method: "POST", body: { password }, token })
}
