import { api } from "@/lib/api"
import type { LandlordOnboarding, MyLandlordProfile } from "@/types"

export function getMyLandlordProfile() {
  return api<MyLandlordProfile>("/landlords/me")
}

export function saveLandlordPreferences(values: LandlordOnboarding) {
  const { preferredTenants, minLeaseMonths, referencesRequired } = values
  return api<MyLandlordProfile>("/landlords/me/preferences", {
    method: "PUT",
    body: { preferredTenants, minLeaseMonths, referencesRequired },
  })
}

export function uploadLandlordPhoto(file: File) {
  const form = new FormData()
  form.append("file", file)
  return api<{ photoUrl: string }>("/landlords/me/photo", { method: "POST", body: form })
}

// The saved profile in the shape onboarding step 1 edits. Missing values are left out
// rather than set to undefined, so they don't wipe out the form's defaults.
export function preferencesFromProfile(profile: MyLandlordProfile): Partial<LandlordOnboarding> {
  const saved = {
    photoUrl: profile.photoUrl,
    preferredTenants: profile.preferredTenants,
    minLeaseMonths: profile.minLeaseMonths,
    referencesRequired: profile.referencesRequired,
  }
  return {
    ...Object.fromEntries(Object.entries(saved).filter(([, value]) => value != null)),
    photoCount: profile.photoUrl ? 1 : 0,
  }
}
