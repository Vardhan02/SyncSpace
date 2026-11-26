export type UserRole = "tenant" | "landlord"

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type House = {
  id: string
  landlordId: string
  title: string
  area: string
  address: string
  rent: number
  roomType: string
  availableFrom: string
  rooms: number
  matchScore: number
  photos: number
  verified: boolean
  amenities: string[]
  description: string
  rules: string[]
  likedByMatches: string[]
}

// Onboarding answers. Field names are the Supabase column names in camelCase,
// grouped by the table they're saved to.

// tenant_prompt_answers: the slot is the position in the array (1–3).
export type PromptAnswer = {
  promptId: number
  answer: string
}

export type TenantOnboarding = {
  // tenants (photo_url gets filled in once photos can be uploaded)
  age?: number
  university?: string
  course?: string
  bio?: string
  photoCount: number

  // tenant_house_preferences
  budgetMin: number
  budgetMax: number
  preferredAreas: string[]
  roomType: string
  moveInDate: string
  leaseMonths: number
  maxHousemates: number

  // tenant_lifestyle_preferences
  sleepSchedule: string
  noiseTolerance: number
  cleanliness: string
  workSchedule: string
  socialLevel: string
  guestFrequency: string
  smoker: boolean
  okWithSmoking: boolean
  hasPets: boolean
  okWithPets: boolean

  // tenant_interests
  interests: string[]

  // tenant_prompt_answers
  prompts: PromptAnswer[]
}

export type LandlordOnboarding = {
  // landlords (photo_url gets filled in once photos can be uploaded)
  photoCount: number

  // landlord_preferences
  preferredTenants: string
  minLeaseMonths: number
  referencesRequired: boolean

  // houses
  title: string
  area: string
  address: string
  rent: number
  roomType: string
  availableFrom: string
  roomsAvailable: number
  description: string

  // house_amenities
  amenities: string[]

  // house_preferences
  petsAllowed: boolean
  smokingAllowed: boolean
  guestPolicy: string
  quietHoursStart?: string
  quietHoursEnd?: string
  houseMinLeaseMonths: number
  maxOccupants: number
  extraRules?: string

  // house_photos
  housePhotoCount: number
}

// How a tenant shows up on a roommate card. These are display labels, not the
// database values in TenantOnboarding.
export type TenantPreferences = {
  budgetMin: number
  budgetMax: number
  areas: string[]
  moveIn: string
  leaseLength: string
  sleepSchedule: string
  cleanliness: string
  noiseTolerance: string
  studyPattern: string
  socialStyle: string
  guests: string
  smoking: string
  pets: string
  interests: string[]
  prompts: { prompt: string; answer: string }[]
}

export type Roommate = Pick<
  TenantPreferences,
  | "budgetMin"
  | "budgetMax"
  | "areas"
  | "moveIn"
  | "leaseLength"
  | "sleepSchedule"
  | "cleanliness"
  | "noiseTolerance"
  | "studyPattern"
  | "socialStyle"
  | "guests"
  | "smoking"
  | "pets"
  | "interests"
  | "prompts"
> & {
  id: string
  name: string
  age: number
  photo: string | null
  course: string
  university: string
  bio: string
  matchScore: number
}

// A pair of matched tenants who both clicked Apply on the same house.
export type Application = {
  id: string
  houseId: string
  tenantIds: [string, string]
  submittedAt: string
}

export type ApplicationDecision = "confirmed" | "ignored"

export type MatchPerson = Pick<Roommate, "id" | "name" | "photo"> &
  Partial<Pick<Roommate, "course" | "university">>

export type SharedHouse = {
  house: House
  fromMe: boolean
  sentAt: string
}

export type Match = {
  id: string
  roommate: MatchPerson
  matchedAt: string
  unread: boolean
  sharedHouses: SharedHouse[]
}
