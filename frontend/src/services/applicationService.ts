import applications from "@/mocks/applications.json"
import users from "@/mocks/users.json"
import { CLEANLINESS, SLEEP_SCHEDULES, labelOf } from "@/lib/onboardingOptions"
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
    budget: onboarding?.budgetMax ?? 0,
    moveIn: onboarding?.moveInDate ?? "",
    sleepSchedule: labelOf(SLEEP_SCHEDULES, onboarding?.sleepSchedule),
    cleanliness: labelOf(CLEANLINESS, onboarding?.cleanliness),
    smoking: onboarding?.smoker ?? false,
    pets: onboarding?.hasPets ?? false,
    interests: onboarding?.interests ?? [],
    matchScore: 0,
  }
}

