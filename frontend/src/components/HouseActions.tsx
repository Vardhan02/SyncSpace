import { Heart, Share2 } from "lucide-react"

import { cn } from "@/lib/utils"

type HouseActionsProps = {
  liked: boolean
  onToggleLike: () => void
  onShare: () => void
  className?: string
}

export function HouseActions({ liked, onToggleLike, onShare, className }: HouseActionsProps) {
  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <button
        type="button"
        aria-label={liked ? "Unlike house" : "Like house"}
        aria-pressed={liked}
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-secondary",
          liked ? "text-red-500" : "text-foreground"
        )}
        onClick={onToggleLike}
      >
        <Heart className={cn("size-5", liked && "fill-current")} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Share house"
        className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
        onClick={onShare}
      >
        <Share2 className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
