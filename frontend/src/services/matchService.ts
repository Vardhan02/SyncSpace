import { api, hasBackend } from "@/lib/api"
import matches from "@/mocks/matches.json"
import { getHouse } from "@/services/houseService"
import { getRoommate } from "@/services/roommateService"
import type { Match } from "@/types"

type ApiMatch = {
  matchId: number
  id: string
  name: string
  photoUrl: string | null
  matchedAt: string
}

const newestFirst = (a: Match, b: Match) => b.matchedAt.localeCompare(a.matchedAt)

function getMockMatches(): Match[] {
  return matches
    .flatMap(({ roommateId, sharedHouses, ...match }) => {
      const roommate = getRoommate(roommateId)
      if (!roommate) return []
      const houses = sharedHouses.flatMap(({ houseId, ...shared }) => {
        const house = getHouse(houseId)
        return house ? [{ ...shared, house }] : []
      })
      return [{ ...match, roommate, sharedHouses: houses }]
    })
    .toSorted(newestFirst)
}

export async function getMatches(): Promise<Match[]> {
  if (!hasBackend) return getMockMatches()

  const { data } = await api.get<ApiMatch[]>("/api/matches")
  return data
    .map((m) => ({
      id: String(m.matchId),
      roommate: { id: m.id, name: m.name, photo: m.photoUrl },
      matchedAt: m.matchedAt,
      unread: false,
      sharedHouses: [],
    }))
    .toSorted(newestFirst)
}
