import { useState } from "react"

import { getMatches } from "@/services/matchService"
import type { House } from "@/types"

export function useShareHouse() {
  const [house, setHouse] = useState<House | null>(null)
  const [sentTo, setSentTo] = useState<string[]>([])

  return {
    shareHouse: house,
    matches: getMatches(),
    sentTo,
    openShare: (house: House) => {
      setHouse(house)
      setSentTo([])
    },
    closeShare: () => setHouse(null),
    send: (matchId: string) => setSentTo((ids) => [...ids, matchId]),
  }
}
