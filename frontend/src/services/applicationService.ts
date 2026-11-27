import { api } from "@/lib/api"
import { cardFromOnboarding } from "@/lib/tenantCard"
import { toRoommate, type ApiTenantCard } from "@/services/roommateService"
import type { ApplicationDecision, ApplicationDetails, LandlordContact, MyApplication, Roommate } from "@/types"

export function getMyApplications() {
  return api<MyApplication[]>("/applications/mine")
}

export function getLandlordContacts() {
  return api<LandlordContact[]>("/landlord-contacts")
}

type ApiTenantRef = { id: string; name: string; photoUrl: string | null }

type ApiApplicationItem = {
  applicationId: number
  createdAt: string
  house: { houseId: number; title: string }
  tenants: [ApiTenantRef, ApiTenantRef]
}

const toApplicant = ({ id, name, photoUrl }: ApiTenantRef): Roommate => ({
  id,
  name,
  age: 0,
  photo: photoUrl,
  course: "",
  university: "",
  bio: "",
  matchScore: 0,
  ...cardFromOnboarding({}),
})

export async function fetchApplications(): Promise<ApplicationDetails[]> {
  const data = await api<ApiApplicationItem[]>("/applications")
  return data.map(({ applicationId, createdAt, house, tenants }) => ({
    application: {
      id: String(applicationId),
      houseId: `h-${house.houseId}`,
      tenantIds: [tenants[0].id, tenants[1].id],
      submittedAt: createdAt,
    },
    house: { id: `h-${house.houseId}`, title: house.title },
    tenants: [toApplicant(tenants[0]), toApplicant(tenants[1])],
  }))
}

type ApiApplicationDetail = {
  applicationId: number
  status: string
  createdAt: string
  house: { houseId: number; title: string }
  tenants: [ApiTenantCard, ApiTenantCard]
}

export async function fetchApplication(id: string): Promise<ApplicationDetails> {
  const data = await api<ApiApplicationDetail>(`/applications/${id}`)
  const { applicationId, status, createdAt, house, tenants } = data
  return {
    application: {
      id: String(applicationId),
      houseId: `h-${house.houseId}`,
      tenantIds: [tenants[0].id, tenants[1].id],
      submittedAt: createdAt,
    },
    house: { id: `h-${house.houseId}`, title: house.title },
    tenants: [toRoommate(tenants[0]), toRoommate(tenants[1])],
    decision: status === "confirmed" || status === "ignored" ? status : undefined,
  }
}

export async function decideApplication(id: string, decision: ApplicationDecision) {
  await api<void>(`/applications/${id}/${decision === "confirmed" ? "confirm" : "ignore"}`, { method: "POST" })
}
