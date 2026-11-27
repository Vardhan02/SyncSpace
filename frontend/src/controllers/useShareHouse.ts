import { useQuery, useQueryClient } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { useState } from "react"
import { toast } from "sonner"

import { getMatches, shareHouse } from "@/services/matchService"
import type { House } from "@/types"

export function useShareHouse() {
  const queryClient = useQueryClient()
  const [house, setHouse] = useState<House | null>(null)
  const [sentTo, setSentTo] = useState<string[]>([])
  const { data: matches = [] } = useQuery({ queryKey: ["matches"], queryFn: getMatches })

  async function send(matchId: string) {
    if (!house) return
    try {
      await shareHouse(matchId, house.id)
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 409) {
        toast.error("Couldn't share this house")
        return
      }
      toast("Already shared with them")
    }
    setSentTo((ids) => [...ids, matchId])
    queryClient.invalidateQueries({ queryKey: ["matches", matchId, "houses"] })
  }

  return {
    shareHouse: house,
    matches,
    sentTo,
    openShare: (house: House) => {
      setHouse(house)
      setSentTo([])
    },
    closeShare: () => setHouse(null),
    send,
  }
}
