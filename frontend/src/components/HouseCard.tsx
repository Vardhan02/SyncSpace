import { BadgeCheck, Heart, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { HouseActions } from "@/components/HouseActions"
import { HousePhotoGrid } from "@/components/HousePhotoGrid"
import { formatDate, formatMatchLikes } from "@/lib/format"
import type { House } from "@/types"

type HouseCardProps = {
  house: House
  liked: boolean
  onToggleLike: () => void
  onShare: () => void
}

export function HouseCard({ house, liked, onToggleLike, onShare }: HouseCardProps) {
  const detailPath = `/houses/${house.id}`

  return (
    <article className="flex flex-col gap-3">
      <Link
        to={detailPath}
        aria-label={`View ${house.title}`}
        className="relative rounded-[16px] transition-opacity hover:opacity-90"
      >
        <HousePhotoGrid
          houseId={house.id}
          coverPhoto={house.coverPhoto}
          photoCount={house.photos}
          className="h-55 rounded-[16px] lg:h-75"
        />
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            <Link to={detailPath} className="truncate hover:underline">
              {house.title}
            </Link>
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

        <HouseActions
          liked={liked}
          onToggleLike={onToggleLike}
          onShare={onShare}
          className="-mt-1.5 -mr-2"
        />
      </div>

      <p className="text-[13px] text-muted-foreground">
        <span className="font-semibold text-foreground">€{house.rent}</span> per month ·{" "}
        {house.roomType} · {house.rooms} {house.rooms === 1 ? "room" : "rooms"} free · from{" "}
        {formatDate(house.availableFrom)}
      </p>

      {house.likedByMatches.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[13px] text-foreground">
          <Heart className="size-3.5 fill-red-500 text-red-500" aria-hidden="true" />
          {formatMatchLikes(house.likedByMatches)}
        </p>
      ) : null}
    </article>
  )
}
