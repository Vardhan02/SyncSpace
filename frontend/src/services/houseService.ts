import { api, toApiHouseId } from "@/lib/api"
import houses from "@/mocks/houses.json"
import { houseFromForm } from "@/services/landlordService"
import type { House, LandlordOnboarding } from "@/types"

type ApiHouse = Omit<
  House,
  "id" | "matchScore" | "photos" | "amenities" | "description" | "rules"
> & {
  id: number
  matchScore: number | null
  photoCount: number
}

type ApiHouseDetail = ApiHouse & Partial<LandlordOnboarding>

const toHouse = ({ id, matchScore, photoCount, ...house }: ApiHouse): House => ({
  ...house,
  id: `h-${id}`,
  matchScore: matchScore ?? 0,
  photos: photoCount,
  amenities: [],
  description: "",
  rules: [],
})

const rankedHouses = (houses as House[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

export function getHouses() {
  return rankedHouses
}

export function getHouse(id: string) {
  return rankedHouses.find((house) => house.id === id)
}

export async function fetchHouses(): Promise<House[]> {
  const { data } = await api.get<ApiHouse[]>("/api/houses")
  return data.map(toHouse)
}

export async function fetchHouse(id: string): Promise<House> {
  const { data } = await api.get<ApiHouseDetail>(`/api/houses/${toApiHouseId(id)}`)
  return houseFromForm(toHouse(data), data)
}

export async function likeHouse(id: string) {
  await api.post(`/api/houses/${toApiHouseId(id)}/like`)
}

export async function unlikeHouse(id: string) {
  await api.delete(`/api/houses/${toApiHouseId(id)}/like`)
}
