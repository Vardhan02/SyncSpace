import matches from "@/mocks/matches.json"
import { getHouse } from "@/services/houseService"
import { getRoommate } from "@/services/roommateService"
import type { Match, SharedHouse } from "@/types"

export function getMatches(): Match[] {
  return matches
    .map(({ roommateId, sharedHouses, ...match }) => ({
      ...match,
      roommate: getRoommate(roommateId),
      sharedHouses: sharedHouses
        .map(({ houseId, ...shared }) => ({ ...shared, house: getHouse(houseId) }))
        .filter((shared): shared is SharedHouse => shared.house !== undefined),
    }))
    .filter((match): match is Match => match.roommate !== undefined)
    .toSorted((a, b) => b.matchedAt.localeCompare(a.matchedAt))
}
