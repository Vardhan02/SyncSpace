import { api } from "@/lib/api"
import type { UserRole } from "@/types"

// The part GET /api/tenants/me and GET /api/landlords/me have in common. GET /api/me has no phone.
export type MyContact = {
  email: string
  phone: string | null
  phoneVisible: boolean
  onboardingComplete: boolean
}

export function getMyContact(role: UserRole) {
  return api<MyContact>(role === "tenant" ? "/tenants/me" : "/landlords/me")
}
