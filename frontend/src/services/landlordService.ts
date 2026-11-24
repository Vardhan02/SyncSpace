import houseLikes from "@/mocks/houseLikes.json"
import houses from "@/mocks/houses.json"
import photoChecks from "@/mocks/photoChecks.json"
import { GUEST_POLICIES, QUIET_END, QUIET_START, ROOM_TYPES } from "@/lib/onboardingOptions"
import type { House, LandlordOnboarding } from "@/types"

const likes = houseLikes as Record<string, string[]>

const labelFor = (options: { value: string; label: string }[], value?: string) =>
  options.find((option) => option.value === value)?.label ?? value ?? ""

// The listing form's fields turned into the House shape the pages use.
function houseFromForm(base: House, data: Partial<LandlordOnboarding>): House {
  const rules = [
    data.petsAllowed ? "Pets allowed" : "No pets",
    data.smokingAllowed ? "Smoking allowed" : "No smoking",
    labelFor(GUEST_POLICIES, data.guestPolicy),
    data.quietHoursStart
      ? `Quiet from ${labelFor(QUIET_START, data.quietHoursStart)} to ${labelFor(QUIET_END, data.quietHoursEnd)}`
      : "",
    ...(data.extraRules ?? "").split("\n"),
  ]
    .map((rule) => rule.trim())
    .filter(Boolean)

  return {
    ...base,
    title: data.title ?? base.title,
    area: data.area ?? base.area,
    address: data.address ?? base.address,
    rent: data.rent ?? base.rent,
    roomType: labelFor(ROOM_TYPES, data.roomType),
    availableFrom: data.availableFrom ?? base.availableFrom,
    rooms: data.roomsAvailable ?? base.rooms,
    amenities: data.amenities ?? base.amenities,
    description: data.description ?? base.description,
    rules,
  }
}

// Builds a House from the listing form, for listings that only exist as form answers:
// the one from onboarding and any the landlord added later.
function listingFromForm(id: string, landlordId: string, data: Partial<LandlordOnboarding>): House | null {
  if (!data.title) return null

  const blank: House = {
    id,
    landlordId,
    title: "",
    area: "",
    address: "",
    rent: 0,
    roomType: "",
    availableFrom: "",
    rooms: 1,
    // No ranking yet; the matching engine scores it once there's a backend.
    matchScore: 0,
    photos: Math.max(data.housePhotoCount ?? 0, 1),
    verified: false,
    amenities: [],
    description: "",
    rules: [],
    likedByMatches: [],
  }
  return houseFromForm(blank, data)
}

// The mock houses only have their rules as text, so this reads them back into the form's
// fields. Anything it doesn't recognise lands in "Anything else?" rather than getting lost.
export function formFromHouse(house: House): Partial<LandlordOnboarding> {
  const form: Partial<LandlordOnboarding> = {
    title: house.title,
    area: house.area,
    address: house.address,
    rent: house.rent,
    roomType: ROOM_TYPES.find((option) => option.label === house.roomType)?.value ?? "",
    availableFrom: house.availableFrom,
    roomsAvailable: house.rooms,
    description: house.description,
    amenities: house.amenities,
    petsAllowed: false,
    smokingAllowed: false,
    guestPolicy: "welcome",
    houseMinLeaseMonths: 1,
    maxOccupants: house.rooms + 1,
    housePhotoCount: house.photos,
  }
  const extra: string[] = []

  for (const rule of house.rules) {
    const quietHour = rule.match(/quiet after (\d+)\s*pm/i)
    if (/^no smoking$/i.test(rule)) form.smokingAllowed = false
    else if (/^smoking allowed$/i.test(rule)) form.smokingAllowed = true
    else if (/^no pets$/i.test(rule)) form.petsAllowed = false
    else if (/pets (allowed|ok)/i.test(rule)) form.petsAllowed = true
    else if (/guest/i.test(rule)) form.guestPolicy = /weekend/i.test(rule) ? "weekends" : "welcome"
    else if (/^no quiet hours$/i.test(rule)) form.quietHoursStart = ""
    else if (quietHour) {
      form.quietHoursStart = `${Number(quietHour[1]) + 12}:00`
      form.quietHoursEnd = "08:00"
    } else extra.push(rule)
  }

  form.extraRules = extra.join("\n")
  return form
}

export type AddedListing = { id: string; landlordId: string; form: Partial<LandlordOnboarding> }

// Where a listing's data lives: onboarding answers, a listing added from My listings,
// or one of the sample houses in the mock file.
export function listingSource(id: string) {
  if (id.startsWith("new-")) return "onboarding"
  if (id.startsWith("l-")) return "added"
  return "sample"
}

export type ListingData = {
  onboarding: Record<string, Partial<LandlordOnboarding> | undefined>
  added: AddedListing[]
  edits: Record<string, Partial<LandlordOnboarding>>
  deletedIds: string[]
}

// Every listing in the app, for tenants and landlords alike. Swapped for a Supabase
// query once the backend is ready.
export function getAllListings({ onboarding, added, edits, deletedIds }: ListingData) {
  const fromOnboarding = Object.entries(onboarding).map(([landlordId, data]) =>
    data ? listingFromForm(`new-${landlordId}`, landlordId, data) : null
  )
  const fromAdded = added.toReversed().map((listing) => listingFromForm(listing.id, listing.landlordId, listing.form))
  const samples = (houses as House[]).map((house) =>
    edits[house.id] ? houseFromForm(house, edits[house.id]) : house
  )

  return [...fromOnboarding, ...fromAdded, ...samples].filter(
    (house): house is House => house !== null && !deletedIds.includes(house.id)
  )
}

// Names only: landlords never see a tenant's contact details from a like.
export function getLikes(houseId: string) {
  return likes[houseId] ?? []
}

// Stand-in for the VLM check: it looks at the listing's photos to confirm each amenity
// and that the photos are clear enough. A listing is verified when both pass.
export type PhotoCheck =
  | { status: "checking" }
  | { status: "done"; verified: boolean; notSeen: string[]; goodPhotos: boolean }

const checks = photoChecks as Record<string, { notSeen: string[]; photoQuality: string }>

export function getPhotoCheck(house: House): PhotoCheck {
  // New listings wait for the real pipeline, which the backend team is building.
  if (listingSource(house.id) !== "sample") return { status: "checking" }

  const result = checks[house.id] ?? { notSeen: [], photoQuality: "good" }
  const goodPhotos = result.photoQuality === "good"
  return {
    status: "done",
    verified: goodPhotos && result.notSeen.length === 0,
    notSeen: result.notSeen,
    goodPhotos,
  }
}
