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
  likedByMatches: string[]
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
