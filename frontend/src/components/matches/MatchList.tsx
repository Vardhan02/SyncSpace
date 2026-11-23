import { Search } from "lucide-react"

import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Match, Roommate } from "@/types"

// Shows the photo, or initials if the roommate has no photo.
export function Avatar({ roommate, size }: { roommate: Roommate; size: string }) {
  if (roommate.photo) {
    return (
      <img
        src={roommate.photo}
        alt={roommate.name}
        className={cn("shrink-0 rounded-full bg-secondary object-cover", size)}
      />
    )
  }

  const initials = roommate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-semibold text-foreground",
        size
      )}
    >
      {initials}
    </div>
  )
}

type Props = {
  matches: Match[]
  selectedId?: string
  search: string
  onSearch: (value: string) => void
  onOpen: (id: string) => void
}

export function MatchList({ matches, selectedId, search, onSearch, onOpen }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <label className="flex items-center gap-2 rounded-[12px] border border-border px-3 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search matches"
            className="w-full bg-transparent text-[14px] text-foreground outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {matches.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onOpen(m.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-secondary",
              m.id === selectedId && "bg-secondary"
            )}
          >
            <Avatar roommate={m.roommate} size="size-12" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[15px] font-semibold text-foreground">{m.roommate.name}</p>
                <span className="shrink-0 text-[12px] text-muted-foreground">{formatDate(m.matchedAt)}</span>
              </div>
              <p className="truncate text-[13px] text-muted-foreground">
                {m.roommate.course} · {m.roommate.matchScore}% match
              </p>
            </div>
            {m.unread && <span className="size-2.5 shrink-0 rounded-full bg-emerald-500" />}
          </button>
        ))}

        {matches.length === 0 && (
          <p className="px-4 py-8 text-center text-[14px] text-muted-foreground">No matches found</p>
        )}
      </div>
    </div>
  )
}
