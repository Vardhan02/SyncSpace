import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"

// Pages only for people who aren't logged in. Anyone logged in goes to their app instead.
export function GuestOnly() {
  const user = useAuthStore((state) => state.user)

  if (!user) return <Outlet />
  if (user.firstLogin) return <Navigate to="/onboarding" replace />
  return <Navigate to={user.role === "tenant" ? "/houses" : "/landlord"} replace />
}
