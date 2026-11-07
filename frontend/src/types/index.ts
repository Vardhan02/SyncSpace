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
