import { api } from "@/lib/api"
import applications from "@/mocks/applications.json"
import users from "@/mocks/users.json"
import { cardFromOnboarding } from "@/lib/tenantCard"
import { getRoommate, toRoommate, type ApiTenantCard } from "@/services/roommateService"
import type { Application, ApplicationDetails, Roommate, TenantOnboarding } from "@/types"

// Mock pair applications. Later these are created when both matched tenants click Apply.
const allApplications = applications as Application[]

export function getApplications() {
  return allApplications
}

export function getApplication(id: string) {
  return allApplications.find((application) => application.id === id)
}

// Applicants are mostly mock roommates. A real user (like the demo tenant) is built from
// what they filled in during onboarding, so the landlord sees their actual answers.
export function getApplicant(id: string, onboarding?: Partial<TenantOnboarding>): Roommate {
  const roommate = getRoommate(id)
  if (roommate) return roommate

  const name = users.find((user) => user.id === id)?.name ?? "Tenant"
  return {
    id,
    name,
    age: onboarding?.age ?? 0,
    photo: null,
    course: onboarding?.course ?? "",
    university: onboarding?.university ?? "",
    bio: onboarding?.bio ?? "",
    matchScore: 0,
    ...cardFromOnboarding(onboarding ?? {}),
  }
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
  const { data } = await api.get<ApiApplicationItem[]>("/api/applications")
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
  const { data } = await api.get<ApiApplicationDetail>(`/api/applications/${id}`)
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
