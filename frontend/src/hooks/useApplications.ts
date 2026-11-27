import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  decideApplication,
  fetchApplication,
  fetchApplications,
  getLandlordContacts,
  getMyApplications,
} from "@/services/applicationService"
import { toApiHouseId } from "@/services/houseService"
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

// The signed-in tenant's application for a house, if they made one with a match
export function useMyApplication(houseId: string) {
  const { data = [] } = useQuery({ queryKey: ["applications", "mine"], queryFn: getMyApplications })
  return data.find((application) => application.houseId === toApiHouseId(houseId)) ?? null
}

// The landlord's details for a confirmed application. The phone is null unless they share it.
export function useLandlordContact(houseId: string, confirmed: boolean) {
  const { data = [] } = useQuery({
    queryKey: ["landlord-contacts"],
    queryFn: getLandlordContacts,
    enabled: confirmed,
  })
  return data.find((contact) => contact.houseId === toApiHouseId(houseId)) ?? null
}
