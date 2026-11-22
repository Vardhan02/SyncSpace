import houseLikes from "@/mocks/houseLikes.json"
import houses from "@/mocks/houses.json"
import { GUEST_POLICIES, QUIET_END, QUIET_START, ROOM_TYPES } from "@/lib/onboardingOptions"
import type { House, LandlordOnboarding } from "@/types"

const likes = houseLikes as Record<string, string[]>

const labelFor = (options: { value: string; label: string }[], value?: string) =>
  options.find((option) => option.value === value)?.label ?? value ?? ""

// Turns the listing a landlord filled in during onboarding into a House, so it shows up
// next to the mock listings. Swapped for a Supabase query once the backend is ready.
function listingFromOnboarding(landlordId: string, data: Partial<LandlordOnboarding>): House | null {
  if (!data.title) return null

  const rules = [
    data.petsAllowed ? "Pets allowed" : "No pets",
    data.smokingAllowed ? "Smoking allowed" : "No smoking",
    labelFor(GUEST_POLICIES, data.guestPolicy),
    data.quietHoursStart
      ? `Quiet from ${labelFor(QUIET_START, data.quietHoursStart)} to ${labelFor(QUIET_END, data.quietHoursEnd)}`
      : "",
    data.extraRules ?? "",
  ].filter(Boolean)

  return {
    id: `new-${landlordId}`,
    landlordId,
    title: data.title,
    area: data.area ?? "",
    address: data.address ?? "",
    rent: data.rent ?? 0,
    roomType: labelFor(ROOM_TYPES, data.roomType),
    availableFrom: data.availableFrom ?? "",
    rooms: data.roomsAvailable ?? 1,
    matchScore: 0,
    photos: Math.max(data.housePhotoCount ?? 0, 1),
    verified: false,
    amenities: data.amenities ?? [],
    description: data.description ?? "",
    rules,
    likedByMatches: [],
  }
}

export function getListings(landlordId: string, onboarding?: Partial<LandlordOnboarding>) {
  const own = (houses as House[]).filter((house) => house.landlordId === landlordId)
  const fromOnboarding = onboarding ? listingFromOnboarding(landlordId, onboarding) : null
  return fromOnboarding ? [fromOnboarding, ...own] : own
}

export function getListing(landlordId: string, houseId: string, onboarding?: Partial<LandlordOnboarding>) {
  return getListings(landlordId, onboarding).find((house) => house.id === houseId)
}

// Names only: landlords never see a tenant's contact details from a like.
export function getLikes(houseId: string) {
  return likes[houseId] ?? []
}
