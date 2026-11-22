import { ArrowLeft, MessageCircle } from "lucide-react"

import { Avatar } from "@/components/matches/MatchList"
import { formatFullDate } from "@/lib/format"
import type { Match } from "@/types"

export function ChatPanel({ match, onBack }: { match: Match | null; onBack: () => void }) {
  if (!match) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <MessageCircle className="size-10 text-muted-foreground" />
        <p className="mt-4 text-[16px] font-semibold text-foreground">No chat selected</p>
        <p className="pt-1 text-[14px] text-muted-foreground">Pick a match to see your conversation.</p>
      </div>
    )
  }

  const { roommate } = match

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar roommate={roommate} size="size-10" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{roommate.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {roommate.course} · {roommate.university}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <Avatar roommate={roommate} size="size-20" />
        <p className="mt-4 text-[16px] font-semibold text-foreground">
          You matched with {roommate.name.split(" ")[0]}
        </p>
        <p className="pt-1 text-[14px] text-muted-foreground">
          {formatFullDate(match.matchedAt)} · {roommate.matchScore}% match
        </p>
      </div>
    </div>
  )
}
