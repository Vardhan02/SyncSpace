export type UserRole = "tenant" | "landlord"

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
}

export type House = {
  id: string
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

export type PromptAnswer = {
  prompt: string
  answer: string
}

export type TenantPreferences = {
  budgetMin: number
  budgetMax: number
  areas: string[]
  roomTypes: string[]
  moveIn: string
  leaseLength: string
  housemates: string
  sleepSchedule: string
  cleanliness: string
  noiseTolerance: string
  studyPattern: string
  socialStyle: string
  guests: string
  smoking: string
  pets: string
  interests: string[]
  prompts: PromptAnswer[]
}

export type ListingDraft = {
  title: string
  area: string
  address: string
  rent: number
  roomType: string
  rooms: number
  availableFrom: string
  description: string
  amenities: string[]
  petPolicy: string
  smokingPolicy: string
  guestPolicy: string
  quietHours: string
  otherRules: string
  photoCount: number
}

// A roommate profile is the same set of answers every tenant gives during
// onboarding (TenantPreferences), plus a few profile basics. `Pick` copies
// just the listed fields from TenantPreferences, so if onboarding changes a
// field's type, the roommate card has to change with it.
export type Roommate = Pick<
  TenantPreferences,
  // Onboarding step 1: "Where do you want to live?"
  | "budgetMin"
  | "budgetMax"
  | "areas"
  | "moveIn"
  | "leaseLength"
  // Onboarding step 2: "How do you live?"
  | "sleepSchedule"
  | "cleanliness"
  | "noiseTolerance"
  | "studyPattern"
  | "socialStyle"
  | "guests"
  | "smoking"
  | "pets"
  | "interests"
  // Onboarding step 3: "A bit about you"
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
