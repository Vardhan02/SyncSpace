import houses from "@/mocks/houses.json"
import type { House } from "@/types"

const rankedHouses = (houses as House[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

export function getHouses() {
  return rankedHouses
}

export function getHouse(id: string) {
  return rankedHouses.find((house) => house.id === id)
}
