import { useState } from "react"

import { getMatches } from "@/services/matchService"

export function useMatches() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [liked, setLiked] = useState<string[]>([])

  const matches = getMatches()
  const filtered = matches.filter((m) => {
    if (unreadOnly && !m.unread) return false
    return m.roommate.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const toggleLike = (houseId: string) => {
    const key = `${selectedId}-${houseId}`
    setLiked((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))
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
    isLiked: (houseId: string) => liked.includes(`${selectedId}-${houseId}`),
    toggleLike,
  }
}
