import applications from "@/mocks/applications.json"
import users from "@/mocks/users.json"
import { cardFromOnboarding } from "@/lib/tenantCard"
import { getRoommate } from "@/services/roommateService"
import type { Application, Roommate, TenantOnboarding } from "@/types"

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

