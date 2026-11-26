import { useMyListings } from "@/hooks/useMyListings"
import users from "@/mocks/users.json"
import { getApplicant, getApplications } from "@/services/applicationService"
import { useApplicationStore } from "@/stores/applicationStore"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { contactFor, useProfileStore } from "@/stores/profileStore"
import type { Application, ApplicationDecision, House, Roommate } from "@/types"

export type ApplicationDetails = {
  application: Application
  house: House
  tenants: [Roommate, Roommate]
  decision?: ApplicationDecision
}

// Applications for the signed-in landlord's listings. Ignored ones are dropped, as the spec says.
export function useLandlordApplications(): ApplicationDetails[] {
  const listings = useMyListings()
  const decisions = useApplicationStore((state) => state.decisions)
  const records = usePreferencesStore((state) => state.records)

  return getApplications().flatMap((application) => {
    const house = listings.find((listing) => listing.id === application.houseId)
    if (!house || decisions[application.id] === "ignored") return []

    const [first, second] = application.tenantIds.map((id) => getApplicant(id, records[id]?.tenant))
    return [{ application, house, tenants: [first, second], decision: decisions[application.id] }]
  })
}

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
  const contacts = useProfileStore((state) => state.contacts)

  const landlord = users.find((user) => user.id === landlordId)
  if (!landlord) return null

  const contact = contactFor(contacts, landlordId)
  return {
    name: landlord.name,
    email: landlord.email,
    phone: contact.phoneVisible ? contact.phone : null,
  }
}
