import { api, hasBackend } from "@/lib/api"
import { cardFromOnboarding } from "@/lib/tenantCard"
import roommates from "@/mocks/roommates.json"
import type { Roommate, TenantOnboarding, TenantPreferences } from "@/types"

type ApiTenantCard = Partial<TenantOnboarding> & {
  id: string
  name: string
  photoUrl: string | null
  matchScore: number | null
}

const rankedRoommates = (roommates as Roommate[]).toSorted((a, b) => b.matchScore - a.matchScore)

export function getRoommates() {
  return rankedRoommates
}

export function getRoommate(id: string) {
  return rankedRoommates.find((roommate) => roommate.id === id)
}

export async function fetchRoommate(id: string): Promise<Roommate | null> {
  if (!hasBackend) return getRoommate(id) ?? null

  const { data } = await api.get<ApiTenantCard>(`/api/roommates/${id}`)
  return {
    id: data.id,
    name: data.name,
    age: data.age ?? 0,
    photo: data.photoUrl,
    course: data.course ?? "",
    university: data.university ?? "",
    bio: data.bio ?? "",
    matchScore: data.matchScore ?? 0,
    ...cardFromOnboarding(data),
  }
}

const LIFESTYLE_MATCHES: { field: keyof TenantPreferences; label: (value: string) => string }[] = [
  { field: "sleepSchedule", label: (v) => v },
  { field: "cleanliness", label: (v) => v },
  { field: "noiseTolerance", label: (v) => v },
  { field: "socialStyle", label: (v) => v },
  { field: "smoking", label: (v) => v },
  { field: "studyPattern", label: (v) => v },
  { field: "guests", label: (v) => `Guests: ${v.toLowerCase()}` },
]

const DAY_MS = 24 * 60 * 60 * 1000

export function getSharedTraits(me: Partial<TenantPreferences>, roommate: Roommate): string[] {
  const shared: string[] = []

  if (
    me.budgetMin !== undefined &&
    me.budgetMax !== undefined &&
    me.budgetMin <= roommate.budgetMax &&
    roommate.budgetMin <= me.budgetMax
  ) {
    shared.push("Budget fits")
  }

  if (me.moveIn) {
    const daysApart = Math.abs(Date.parse(me.moveIn) - Date.parse(roommate.moveIn)) / DAY_MS
    if (daysApart <= 30) shared.push("Same move-in")
  }

  for (const area of me.areas ?? []) {
    if (roommate.areas.includes(area)) shared.push(area)
  }

  if (me.leaseLength && me.leaseLength === roommate.leaseLength) shared.push(me.leaseLength)

  for (const { field, label } of LIFESTYLE_MATCHES) {
    const mine = me[field]
    if (typeof mine === "string" && mine === roommate[field as keyof Roommate]) {
      shared.push(label(mine))
    }
  }

  for (const interest of me.interests ?? []) {
    if (roommate.interests.includes(interest)) shared.push(interest)
  }

  return shared
}
