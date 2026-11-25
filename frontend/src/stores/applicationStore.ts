import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { ApplicationDecision } from "@/types"

// What the landlord did with each application. Tenants read it too, to see the
// landlord's contact details once their application is confirmed.
type ApplicationState = {
  decisions: Record<string, ApplicationDecision>
  decide: (applicationId: string, decision: ApplicationDecision) => void
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set) => ({
      decisions: {},
      decide: (applicationId, decision) =>
        set((state) => ({ decisions: { ...state.decisions, [applicationId]: decision } })),
    }),
    { name: "syncspace-applications" }
  )
)
