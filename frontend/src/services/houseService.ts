import { api } from "@/lib/api"
import { describeRules } from "@/lib/houseRules"
import { ROOM_TYPES, labelOf } from "@/lib/onboardingOptions"
import type { House, HouseRules } from "@/types"

// GET /api/houses
type ApiHouse = {
  id: number
  landlordId: string
  title: string
  area: string
  address: string
  rent: number
  roomType: string
  availableFrom: string
  rooms: number
  matchScore: number | null
  coverPhoto: string | null
  photoCount: number
  verified: boolean
  likedByMe: boolean
  likedByMatches: string[]
}

// GET /api/houses/{id}: the card plus the details and rules
type ApiHouseDetail = ApiHouse &
  HouseRules & {
    description: string | null
    photos: string[]
    amenities: string[]
  }

// The pages use "h-120" style ids, the API uses 120
export const toApiHouseId = (houseId: string) => Number(houseId.replace("h-", ""))

const toHouse = ({ id, matchScore, photoCount, roomType, ...house }: ApiHouse): House => ({
  ...house,
  id: `h-${id}`,
  roomType: labelOf(ROOM_TYPES, roomType) || roomType,
  matchScore: matchScore ?? 0,
  photos: photoCount,
  amenities: [],
  description: "",
  rules: [],
})

export async function fetchHouses(): Promise<House[]> {
  return (await api<ApiHouse[]>("/houses")).map(toHouse)
}

export async function fetchHouse(id: string): Promise<House> {
  const data = await api<ApiHouseDetail>(`/houses/${toApiHouseId(id)}`)
  return {
    ...toHouse(data),
    description: data.description ?? "",
    amenities: data.amenities,
    rules: describeRules(data),
    photoUrls: data.photos,
  }
}

export async function likeHouse(id: string) {
  await api<void>(`/houses/${toApiHouseId(id)}/like`, { method: "POST" })
}

export async function unlikeHouse(id: string) {
  await api<void>(`/houses/${toApiHouseId(id)}/like`, { method: "DELETE" })
}
