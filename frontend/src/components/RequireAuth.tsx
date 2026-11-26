import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { UserRole } from "@/types"

// Leave out `role` for pages any signed-in user can open, like onboarding.
export function RequireAuth({ role }: { role?: UserRole }) {
  const user = useAuthStore((state) => state.user)
  const savedLocally = usePreferencesStore((state) => (user ? Boolean(state.records[user.id]?.completed) : false))
  // The backend clears firstLogin when onboarding is done. Landlord onboarding isn't
  // saved to the backend yet, so landlords still go by this browser's record.
  const onboarded = user?.role === "tenant" ? !user.firstLogin : savedLocally

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const home = user.role === "tenant" ? "/houses" : "/landlord"

  if (!role) {
    return onboarded ? <Navigate to={home} replace /> : <Outlet />
  }

  if (user.role !== role) {
    return <Navigate to={home} replace />
  }

  if (!onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
