import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { applyToHouse, getMatches, getSharedHouses } from "@/services/matchService"

export function useMatches() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [applied, setApplied] = useState<string[]>([])

  const {
    data: matches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
  })
  const { data: sharedHouses = [] } = useQuery({
    queryKey: ["matches", selectedId, "houses"],
    queryFn: () => getSharedHouses(selectedId ?? ""),
    enabled: selectedId !== null,
  })
  const filtered = matches.filter((m) => {
    if (unreadOnly && !m.unread) return false
    return m.roommate.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const key = (houseId: string) => `${selectedId}-${houseId}`

  const toggleLike = (houseId: string) => {
    const k = key(houseId)
    setLiked((keys) => (keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k]))
  }

  const apply = async (houseId: string) => {
    if (!selectedId) return
    try {
      const bothApplied = await applyToHouse(selectedId, houseId)
      setApplied((keys) => [...keys, key(houseId)])
      toast.success(
        bothApplied ? "You both applied, sent to the landlord!" : "Applied, waiting for your match"
      )
      queryClient.invalidateQueries({ queryKey: ["matches", selectedId, "houses"] })
    } catch {
      toast.error("Couldn't apply for this house")
    }
  }

  return {
    matches: filtered,
    isLoading,
    isError,
    sharedHouses,
    unreadCount: matches.filter((m) => m.unread).length,
    selected: matches.find((m) => m.id === selectedId) ?? null,
    search,
    setSearch,
    unreadOnly,
    setUnreadOnly,
    openChat: setSelectedId,
    closeChat: () => setSelectedId(null),
    isLiked: (houseId: string) => liked.includes(key(houseId)),
    toggleLike,
    isApplied: (houseId: string) =>
      applied.includes(key(houseId)) ||
      sharedHouses.some((shared) => shared.house.id === houseId && shared.iApplied),
    apply,
  }
}
