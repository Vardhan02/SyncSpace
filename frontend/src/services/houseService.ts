import { api } from "@/lib/api"
import houses from "@/mocks/houses.json"
import type { House } from "@/types"

type ApiHouse = Omit<
  House,
  "id" | "matchScore" | "photos" | "amenities" | "description" | "rules"
> & {
  id: number
  matchScore: number | null
  photoCount: number
}

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
  return data.map(({ id, matchScore, photoCount, ...house }) => ({
    ...house,
    id: `h-${id}`,
    matchScore: matchScore ?? 0,
    photos: photoCount,
    amenities: [],
    description: "",
    rules: [],
  }))
}
