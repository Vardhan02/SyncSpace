export type UserRole = "tenant" | "landlord"

// GET /api/me, and the `user` inside a login or sign-up response
export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  firstLogin: boolean
}

// What POST /api/auth/login, /signup and /refresh send back
export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
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
  // tenants. photoUrl is the uploaded photo, photoCount counts what's in the picker.
  photoUrl?: string
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
  // landlords. photoUrl is the uploaded photo, photoCount counts what's in the picker.
  photoUrl?: string
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

// A tenant as the API sends them (TenantCard in the backend): raw values like
// "night_owl", never labels, and no contact details
export type TenantCard = {
  id: string
  name: string
  age: number
  photoUrl: string | null
  university: string
  course: string
  bio: string
  budgetMin: number
  budgetMax: number
  preferredAreas: string[]
  roomType: string
  moveInDate: string
  leaseMonths: number
  maxHousemates: number
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
  interests: string[]
  prompts: { promptId: number; text: string; answer: string }[]
  matchScore: number | null
}

// GET /api/tenants/me. The card fields are missing until onboarding is saved.
export type MyTenantProfile = Partial<TenantCard> & {
  email: string
  phone: string | null
  phoneVisible: boolean
  onboardingComplete: boolean
}

// GET /api/landlords/me. The preferences are null until onboarding step 1 is saved.
export type MyLandlordProfile = {
  id: string
  name: string
  photoUrl: string | null
  email: string
  phone: string | null
  phoneVisible: boolean
  onboardingComplete: boolean
  preferredTenants: string | null
  minLeaseMonths: number | null
  referencesRequired: boolean | null
}

export type ListingStatus = "draft" | "active" | "pending" | "filled"

// A landlord's own listing, as GET/POST/PUT /api/listings send it back
export type ListingDetail = {
  houseId: number
  title: string
  area: string
  address: string
  rent: number
  roomType: string
  availableFrom: string
  roomsAvailable: number
  description: string | null
  status: ListingStatus
  verified: boolean
  createdAt: string
  petsAllowed: boolean
  smokingAllowed: boolean
  guestPolicy: string
  quietHoursStart: string | null
  quietHoursEnd: string | null
  minLeaseMonths: number
  maxOccupants: number
  extraRules: string | null
  // vlmVerified is the photo check's answer: null while it hasn't run
  amenities: { name: string; vlmVerified: boolean | null }[]
  photos: { photoId: number; url: string; position: number }[]
  likeCount: number
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

export type SharedHouse = {
  house: House
  fromMe: boolean
  sentAt: string
}

export type Match = {
  id: string
  roommate: Roommate
  matchedAt: string
  unread: boolean
  sharedHouses: SharedHouse[]
}
