import { api, hasBackend } from "@/lib/api"
import matches from "@/mocks/matches.json"
import { getHouse } from "@/services/houseService"
import { getRoommate } from "@/services/roommateService"
import type { Match, SharedHouse } from "@/types"

type ApiMatch = {
  matchId: number
  id: string
  name: string
  photoUrl: string | null
  matchedAt: string
}

type ApiSharedHouse = {
  houseId: number
  title: string
  area: string
  rent: number
  sharedByMe: boolean
  sharedAt: string
}

const newestFirst = (a: Match, b: Match) => b.matchedAt.localeCompare(a.matchedAt)

const toApiHouseId = (houseId: string) => Number(houseId.replace("h-", ""))

export async function getMatches(): Promise<Match[]> {
  if (!hasBackend) {
    return matches
      .flatMap(({ id, roommateId, matchedAt, unread }) => {
        const roommate = getRoommate(roommateId)
        return roommate ? [{ id, roommate, matchedAt, unread }] : []
      })
      .toSorted(newestFirst)
  }

  const { data } = await api.get<ApiMatch[]>("/api/matches")
  return data
    .map((m) => ({
      id: String(m.matchId),
      roommate: { id: m.id, name: m.name, photo: m.photoUrl },
      matchedAt: m.matchedAt,
      unread: false,
    }))
    .toSorted(newestFirst)
}

export async function getSharedHouses(matchId: string): Promise<SharedHouse[]> {
  if (!hasBackend) {
    const match = matches.find((m) => m.id === matchId)
    return (match?.sharedHouses ?? []).flatMap(({ houseId, fromMe, sentAt }) => {
      const house = getHouse(houseId)
      return house ? [{ house, fromMe, sentAt }] : []
    })
  }

  const { data } = await api.get<ApiSharedHouse[]>(`/api/matches/${matchId}/houses`)
  return data.map((h) => ({
    house: { id: `h-${h.houseId}`, title: h.title, area: h.area, rent: h.rent },
    fromMe: h.sharedByMe,
    sentAt: h.sharedAt,
  }))
}

export async function shareHouse(matchId: string, houseId: string) {
  if (!hasBackend) return

  await api.post(`/api/matches/${matchId}/houses`, { houseId: toApiHouseId(houseId) })
}
