import { useState } from "react"

import { getMatches } from "@/services/matchService"

export function useMatches() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(false)

  const matches = getMatches()
  const filtered = matches.filter((m) => {
    if (unreadOnly && !m.unread) return false
    return m.roommate.name.toLowerCase().includes(search.trim().toLowerCase())
  })

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
  }
}
