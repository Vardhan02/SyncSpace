import { ArrowLeft, MessageCircle } from "lucide-react"

import { Avatar } from "@/components/matches/MatchList"
import { SharedHouseCard } from "@/components/matches/SharedHouseCard"
import { formatFullDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

type ChatPanelProps = {
  match: Match | null
  onBack: () => void
  isLiked: (houseId: string) => boolean
  onLike: (houseId: string) => void
}

export function ChatPanel({ match, onBack, isLiked, onLike }: ChatPanelProps) {
  if (!match) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <MessageCircle className="size-10 text-muted-foreground" />
        <p className="mt-4 text-[16px] font-semibold text-foreground">No chat selected</p>
        <p className="pt-1 text-[14px] text-muted-foreground">
          Pick a match to see your conversation.
        </p>
      </div>
    )
  }

  const { roommate } = match
  const firstName = roommate.name.split(" ")[0]

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

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-8 pb-28 md:px-6 md:pb-8",
          match.sharedHouses.length === 0 && "justify-center"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <Avatar roommate={roommate} size="size-20" />
          <p className="mt-4 text-[16px] font-semibold text-foreground">
            You matched with {firstName}
          </p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            {formatFullDate(match.matchedAt)}
          </p>
        </div>

        {match.sharedHouses.map((shared) => (
          <SharedHouseCard
            key={shared.house.id}
            shared={shared}
            name={firstName}
            liked={isLiked(shared.house.id)}
            onLike={() => onLike(shared.house.id)}
          />
        ))}
      </div>
    </div>
  )
}
