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

// null when Supabase wants the email confirmed before the first login
export async function signup(details: SignupDetails) {
  const result = await api<AuthSession | { message: string }>("/auth/signup", {
    method: "POST",
    body: details,
  })
  return "accessToken" in result ? result : null
}
