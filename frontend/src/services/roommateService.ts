import roommates from "@/mocks/roommates.json"
import type { Roommate, TenantPreferences } from "@/types"

// MODEL: the only place that knows where roommate data comes from, plus the
// rules about that data (like "what do these two people have in common?").
// Today the data is a mock JSON file; later this can call the real backend
// API without the controller or views needing to change.

const rankedRoommates = (roommates as Roommate[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

/** All roommates, best match first. */
export function getRoommates() {
  return rankedRoommates
}

export function getRoommate(id: string) {
  return rankedRoommates.find((roommate) => roommate.id === id)
}

// Lifestyle answers worth pointing out when both people picked the same one.
// Each entry: which onboarding field to compare, and how to word it on the card.
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

/**
 * Compares the signed-in tenant's onboarding answers (`me`) with a roommate's
 * and returns short labels for everything they share, most important first.
 * Returns [] if the tenant hasn't filled in onboarding yet.
 */
export function getSharedTraits(me: Partial<TenantPreferences>, roommate: Roommate): string[] {
  const shared: string[] = []

  // 1. Practical dealbreakers: can you afford the same place, at the same time, in the same area?
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

  // 2. Lifestyle: same answer to the same question.
  for (const { field, label } of LIFESTYLE_MATCHES) {
    const mine = me[field]
    if (typeof mine === "string" && mine === roommate[field as keyof Roommate]) {
      shared.push(label(mine))
    }
  }

  // 3. Interests you both picked.
  for (const interest of me.interests ?? []) {
    if (roommate.interests.includes(interest)) shared.push(interest)
  }

  return shared
}
