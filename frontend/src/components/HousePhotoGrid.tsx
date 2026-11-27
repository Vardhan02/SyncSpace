import { useQuery } from "@tanstack/react-query"
import { House as HouseIcon } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { fetchHouse } from "@/services/houseService"

type HousePhotoGridProps = {
  houseId: string
  coverPhoto?: string | null
  // Below 2 there's nothing more to load than the cover
  photoCount?: number
  className?: string
}

// A big cover photo with two smaller ones beside it. Lists from the API only give the cover, so
// the rest come from the house's details, the same request (and cache) the house page uses.
export function HousePhotoGrid({ houseId, coverPhoto, photoCount, className }: HousePhotoGridProps) {
  const { data: detail } = useQuery({
    queryKey: ["houses", houseId],
    queryFn: () => fetchHouse(houseId),
    enabled: photoCount === undefined || photoCount > 1,
  })
  const photos = detail?.photoUrls ?? (coverPhoto ? [coverPhoto] : [])
  const extraPhotos = (photoCount ?? photos.length) - 3

  return (
    <div className={cn("grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden", className)}>
      <PhotoTile url={photos[0]} className="col-span-2 row-span-2 bg-[#e7e5de]" showIcon />
      <PhotoTile url={photos[1]} className="bg-[#efede6]" />
      <PhotoTile url={photos[2]} className="relative bg-[#dcdad2]">
        {extraPhotos > 0 ? (
          <span className="absolute right-2 bottom-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-foreground">
            +{extraPhotos}
          </span>
        ) : null}
      </PhotoTile>
    </div>
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
        <HouseIcon className="size-1/4 max-h-8 max-w-8 text-[#b4b2a9]" aria-hidden="true" />
      ) : null}
      {children}
    </div>
  )
}
