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

export type Roommate = {
  id: string
  name: string
  age: number
  photo: string | null
  course: string
  university: string
  bio: string
  budget: number
  moveIn: string
  sleepSchedule: string
  cleanliness: string
  smoking: boolean
  pets: boolean
  interests: string[]
  matchScore: number
}
