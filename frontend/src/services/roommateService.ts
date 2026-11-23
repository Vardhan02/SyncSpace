import roommates from "@/mocks/roommates.json"
import type { Roommate } from "@/types"

// MODEL: the only place that knows where roommate data comes from.
// Today it's a mock JSON file; later this can call the real backend API
// without the controller or views needing to change.

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
