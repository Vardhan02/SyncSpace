import { useState } from "react"

import { getMatches } from "@/services/matchService"

// Controller: which chat is open and what the search box filters.
export function useMatches() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const matches = getMatches()
  const filtered = matches.filter((m) =>
    m.roommate.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  return {
    matches: filtered,
    total: matches.length,
    selected: matches.find((m) => m.id === selectedId) ?? null,
    search,
    setSearch,
    openChat: setSelectedId,
    closeChat: () => setSelectedId(null),
  }
}
