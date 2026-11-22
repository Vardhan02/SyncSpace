import matches from "@/mocks/matches.json"
import { getRoommate } from "@/services/roommateService"
import type { Match } from "@/types"

// Model: joins each match with the roommate it belongs to, newest first.
export function getMatches(): Match[] {
  return matches
    .map(({ roommateId, ...match }) => ({ ...match, roommate: getRoommate(roommateId) }))
    .filter((match): match is Match => match.roommate !== undefined)
    .toSorted((a, b) => b.matchedAt.localeCompare(a.matchedAt))
}
