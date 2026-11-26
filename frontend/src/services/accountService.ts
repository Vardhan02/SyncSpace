import { api } from "@/lib/api"
import type { User } from "@/types"

// Only the fields that are sent get changed
export type AccountChanges = {
  name?: string
  phone?: string
  phoneVisible?: boolean
}

export function updateAccount(changes: AccountChanges) {
  return api<User>("/me", { method: "PUT", body: changes })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api<void>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } })
}

export function deleteAccount(password: string) {
  return api<void>("/me", { method: "DELETE", body: { password } })
}
