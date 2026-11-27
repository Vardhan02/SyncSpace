import { useQuery, useQueryClient } from "@tanstack/react-query"

import users from "@/mocks/users.json"
import {
  decideApplication,
  fetchApplication,
  fetchApplications,
  getApplicant,
  getApplications,
} from "@/services/applicationService"
import { useApplicationStore } from "@/stores/applicationStore"
import { useAuthStore } from "@/stores/authStore"
import type { ApplicationDecision, ApplicationDetails } from "@/types"

export type { ApplicationDetails }

// Applications for the signed-in landlord's listings. Ignored ones are dropped, as the spec says.
export function useLandlordApplications(): ApplicationDetails[] {
  const { data = [] } = useQuery({ queryKey: ["applications"], queryFn: fetchApplications })
  return data
}

export function useLandlordApplication(id: string) {
  const fromList = useLandlordApplications().find((entry) => entry.application.id === id)
  const { data } = useQuery({ queryKey: ["applications", id], queryFn: () => fetchApplication(id) })
  return data ?? fromList
}

export function useDecideApplication() {
  const queryClient = useQueryClient()

  return async (id: string, decision: ApplicationDecision) => {
    await decideApplication(id, decision)
    await queryClient.invalidateQueries({ queryKey: ["applications"] })
  }
}

// Still mock data until /api/applications/mine and /api/landlord-contacts are connected.
// The signed-in tenant's application for a house, if they're part of one.
export function useMyApplication(houseId: string) {
  const userId = useAuthStore((state) => state.user?.id) ?? ""
  const decisions = useApplicationStore((state) => state.decisions)

  const application = getApplications().find(
    (item) => item.houseId === houseId && item.tenantIds.includes(userId)
  )
  if (!application) return null

  const partnerId = application.tenantIds.find((id) => id !== userId) ?? ""
  return { application, partner: getApplicant(partnerId), decision: decisions[application.id] }
}

// What a tenant sees once the landlord confirms. The phone is left out unless the
// landlord chose to share it.
export function useLandlordContact(landlordId: string) {
  const landlord = users.find((user) => user.id === landlordId)
  if (!landlord) return null

  // The mock landlords all share their phone
  return { name: landlord.name, email: landlord.email, phone: landlord.phone }
}
