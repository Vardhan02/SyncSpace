import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"

export function RequireAuth({ role }: { role: UserRole }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== role) {
    return <Navigate to={user.role === "tenant" ? "/houses" : "/landlord"} replace />
  }

  return <Outlet />
}
