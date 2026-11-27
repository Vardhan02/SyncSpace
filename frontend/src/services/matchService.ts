import { api } from "@/lib/api"
import { toApiHouseId } from "@/services/houseService"
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
  coverPhoto: string | null
  sharedByMe: boolean
  sharedAt: string
  iApplied: boolean
  theyApplied: boolean
  applicationStatus: SharedHouse["applicationStatus"]
}

const newestFirst = (a: Match, b: Match) => b.matchedAt.localeCompare(a.matchedAt)

export async function getMatches(): Promise<Match[]> {
  const data = await api<ApiMatch[]>("/matches")
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
  const data = await api<ApiSharedHouse[]>(`/matches/${matchId}/houses`)
  return data.map((h) => ({
    house: { id: `h-${h.houseId}`, title: h.title, area: h.area, rent: h.rent, coverPhoto: h.coverPhoto },
    fromMe: h.sharedByMe,
    sentAt: h.sharedAt,
    iApplied: h.iApplied,
    theyApplied: h.theyApplied,
    applicationStatus: h.applicationStatus,
  }))
}

export async function shareHouse(matchId: string, houseId: string) {
  await api<void>(`/matches/${matchId}/houses`, { method: "POST", body: { houseId: toApiHouseId(houseId) } })
}

export async function applyToHouse(matchId: string, houseId: string): Promise<boolean> {
  const { bothApplied } = await api<{ bothApplied: boolean }>(`/matches/${matchId}/apply`, {
    method: "POST",
    body: { houseId: toApiHouseId(houseId) },
  })
  return bothApplied
}
