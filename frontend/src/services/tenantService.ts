import { api } from "@/lib/api"
import type { MyTenantProfile, TenantOnboarding } from "@/types"

// Exactly what PUT /api/tenants/me takes. photoUrl and photoCount only exist in the form.
function toAnswers(values: TenantOnboarding) {
  return {
    age: values.age,
    university: values.university,
    course: values.course,
    bio: values.bio,
    budgetMin: values.budgetMin,
    budgetMax: values.budgetMax,
    preferredAreas: values.preferredAreas,
    roomType: values.roomType,
    moveInDate: values.moveInDate,
    leaseMonths: values.leaseMonths,
    maxHousemates: values.maxHousemates,
    sleepSchedule: values.sleepSchedule,
    noiseTolerance: values.noiseTolerance,
    cleanliness: values.cleanliness,
    workSchedule: values.workSchedule,
    socialLevel: values.socialLevel,
    guestFrequency: values.guestFrequency,
    smoker: values.smoker,
    okWithSmoking: values.okWithSmoking,
    hasPets: values.hasPets,
    okWithPets: values.okWithPets,
    interests: values.interests,
    prompts: values.prompts,
  }
}

// The saved profile in the shape the onboarding steps edit
export function answersFromProfile(profile: MyTenantProfile): Partial<TenantOnboarding> {
  // Everything except the answers themselves is left out
  const {
    id: _id,
    name: _name,
    matchScore: _matchScore,
    email: _email,
    phone: _phone,
    phoneVisible: _phoneVisible,
    onboardingComplete: _onboardingComplete,
    photoUrl,
    prompts,
    ...answers
  } = profile
  return {
    ...answers,
    photoUrl: photoUrl ?? undefined,
    photoCount: photoUrl ? 1 : 0,
    prompts: prompts?.map(({ promptId, answer }) => ({ promptId, answer })),
  }
}

export function getMyTenantProfile() {
  return api<MyTenantProfile>("/tenants/me")
}

export function saveTenantAnswers(values: TenantOnboarding) {
  return api<MyTenantProfile>("/tenants/me", { method: "PUT", body: toAnswers(values) })
}

export function uploadTenantPhoto(file: File) {
  const form = new FormData()
  form.append("file", file)
  return api<{ photoUrl: string }>("/tenants/me/photo", { method: "POST", body: form })
}
