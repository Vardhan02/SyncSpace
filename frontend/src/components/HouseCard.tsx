import { BadgeCheck, Heart, House as HouseIcon, MapPin, Share2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { House } from "@/types"

type HouseCardProps = {
  house: House
  liked: boolean
  onToggleLike: () => void
  onShare: () => void
}

function formatMatches(names: string[]) {
  if (names.length === 1) return `Liked by ${names[0]} from your matches`
  return `Liked by ${names[0]} and ${names.length - 1} more of your matches`
}

export function HouseCard({ house, liked, onToggleLike, onShare }: HouseCardProps) {
  const extraPhotos = house.photos - 3
  const availableFrom = new Date(house.availableFrom).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
  })

  return (
    <article className="flex flex-col gap-3">
      <div className="relative grid h-55 grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-[16px] lg:h-75">
        <div className="col-span-2 row-span-2 flex items-center justify-center bg-[#e7e5de]">
          <HouseIcon className="size-8 text-[#b4b2a9]" aria-hidden="true" />
        </div>
        <div className="bg-[#efede6]" />
        <div className="relative bg-[#dcdad2]">
          {extraPhotos > 0 ? (
            <span className="absolute right-2 bottom-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-foreground">
              +{extraPhotos}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            <span className="truncate">{house.title}</span>
            {house.verified ? (
              <BadgeCheck
                className="size-4 shrink-0 text-foreground"
                aria-label="Verified listing"
              />
            ) : null}
          </h2>
          <p className="flex items-center gap-1 pt-0.5 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {house.area}, Cork
          </p>
        </div>

        <div className="-mt-1.5 -mr-2 flex shrink-0 items-center">
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
      </div>

      <p className="text-[13px] text-muted-foreground">
        <span className="font-semibold text-foreground">€{house.rent}</span> per month ·{" "}
        {house.roomType} · {house.rooms} {house.rooms === 1 ? "room" : "rooms"} free · from{" "}
        {availableFrom}
      </p>

      {house.likedByMatches.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[13px] text-foreground">
          <Heart className="size-3.5 fill-red-500 text-red-500" aria-hidden="true" />
          {formatMatches(house.likedByMatches)}
        </p>
      ) : null}
    </article>
  )
}
