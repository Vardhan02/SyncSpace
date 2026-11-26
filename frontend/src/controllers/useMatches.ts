import { useState } from "react"

import { getMatches } from "@/services/matchService"

export function useMatches() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [applied, setApplied] = useState<string[]>([])

  const matches = getMatches()
  const filtered = matches.filter((m) => {
    if (unreadOnly && !m.unread) return false
    return m.roommate.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const key = (houseId: string) => `${selectedId}-${houseId}`

  const toggleLike = (houseId: string) => {
    const k = key(houseId)
    setLiked((keys) => (keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k]))
  }

  return {
    matches: filtered,
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
    isApplied: (houseId: string) => applied.includes(key(houseId)),
    apply: (houseId: string) => setApplied((keys) => [...keys, key(houseId)]),
  }
}
