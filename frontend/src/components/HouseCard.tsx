import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, Heart, House as HouseIcon, MapPin } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { HouseActions } from "@/components/HouseActions"
import { formatDate, formatMatchLikes } from "@/lib/format"
import { cn } from "@/lib/utils"
import { fetchHouse } from "@/services/houseService"
import type { House } from "@/types"

type HouseCardProps = {
  house: House
  liked: boolean
  onToggleLike: () => void
  onShare: () => void
}

export function HouseCard({ house, liked, onToggleLike, onShare }: HouseCardProps) {
  // The house list only has the cover photo. The rest come with the details, which the detail
  // page loads anyway, so opening the house afterwards is instant.
  const { data: detail } = useQuery({
    queryKey: ["houses", house.id],
    queryFn: () => fetchHouse(house.id),
    enabled: house.photos > 1,
  })
  const photos = detail?.photoUrls ?? (house.coverPhoto ? [house.coverPhoto] : [])
  const extraPhotos = house.photos - 3
  const detailPath = `/houses/${house.id}`

  return (
    <article className="flex flex-col gap-3">
      <Link
        to={detailPath}
        aria-label={`View ${house.title}`}
        className="relative grid h-55 grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-[16px] transition-opacity hover:opacity-90 lg:h-75"
      >
        <PhotoTile url={photos[0]} className="col-span-2 row-span-2 bg-[#e7e5de]" showIcon />
        <PhotoTile url={photos[1]} className="bg-[#efede6]" />
        <PhotoTile url={photos[2]} className="relative bg-[#dcdad2]">
          {extraPhotos > 0 ? (
            <span className="absolute right-2 bottom-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-foreground">
              +{extraPhotos}
            </span>
          ) : null}
        </PhotoTile>
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

type PhotoTileProps = { url?: string; className: string; showIcon?: boolean; children?: ReactNode }

// A grey tile until there's a photo, and again if the photo can't be loaded
function PhotoTile({ url, className, showIcon = false, children }: PhotoTileProps) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn("flex items-center justify-center overflow-hidden", className)}>
      {url && !failed ? (
        <img src={url} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : showIcon ? (
        <HouseIcon className="size-8 text-[#b4b2a9]" aria-hidden="true" />
      ) : null}
      {children}
    </div>
  )
}
