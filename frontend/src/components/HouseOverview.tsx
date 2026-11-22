import { ArrowLeft, BadgeCheck, Check, House as HouseIcon, MapPin } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { House } from "@/types"

const photoShades = ["#e7e5de", "#efede6", "#dcdad2", "#e4e2da", "#d6d4cc"]

type HouseOverviewProps = {
  house: House
  backTo: string
  backLabel: string
  // Buttons next to the title, e.g. like/share for tenants or edit/delete for landlords.
  actions: ReactNode
  // The sticky box on the right.
  aside: ReactNode
}

// The parts of a house page that tenants and landlords both see.
export function HouseOverview({ house, backTo, backLabel, actions, aside }: HouseOverviewProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false)

  const photos = Array.from({ length: house.photos }, (_, index) => index)
  const previewCount = photos.length >= 5 ? 5 : 3
  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, previewCount)

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
            {house.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {house.address}
            </span>
            {house.verified ? (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <BadgeCheck className="size-4" aria-hidden="true" />
                Verified listing
              </span>
            ) : null}
          </div>
        </div>
        {actions}
      </div>

      <div
        className={cn(
          "grid gap-1.5 overflow-hidden rounded-[20px]",
          showAllPhotos
            ? "grid-cols-2 sm:grid-cols-3"
            : cn(
                "h-72 grid-cols-2 grid-rows-2 md:h-105",
                previewCount === 5 ? "md:grid-cols-4" : "md:grid-cols-3"
              )
        )}
      >
        {visiblePhotos.map((photo) => (
          <div
            key={photo}
            style={{ backgroundColor: photoShades[photo % photoShades.length] }}
            className={cn(
              "flex items-center justify-center",
              showAllPhotos && "aspect-4/3",
              !showAllPhotos && photo === 0 && "col-span-2 md:row-span-2",
              !showAllPhotos && photo > 2 && "hidden md:flex"
            )}
          >
            {photo === 0 ? (
              <HouseIcon className="size-10 text-[#b4b2a9]" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>

      {house.photos > 3 ? (
        <button
          type="button"
          className="-mt-2 w-fit text-[14px] font-medium text-foreground underline underline-offset-4"
          onClick={() => setShowAllPhotos((value) => !value)}
        >
          {showAllPhotos ? "Show fewer photos" : `Show all ${house.photos} photos`}
        </button>
      ) : null}

      <div className="grid gap-10 pt-2 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-[18px] font-semibold text-foreground">The room</h2>
            <ul className="flex flex-col gap-2.5 text-[15px] text-foreground">
              <li>{house.roomType}</li>
              <li>
                {house.rooms} {house.rooms === 1 ? "room" : "rooms"} free
              </li>
              {house.availableFrom ? (
                <li>Move in from {formatDate(house.availableFrom, "long")}</li>
              ) : null}
            </ul>
          </section>

          {house.description ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-[18px] font-semibold text-foreground">About this house</h2>
              <p className="text-[15px] leading-6 text-muted-foreground">{house.description}</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-[18px] font-semibold text-foreground">What's included</h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {house.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-2.5 text-[15px] text-foreground">
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[18px] font-semibold text-foreground">House rules</h2>
            <ul className="flex flex-col gap-2.5">
              {house.rules.map((rule) => (
                <li key={rule} className="text-[15px] text-foreground">
                  {rule}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit rounded-[20px] border border-border p-6 lg:sticky lg:top-24">
          {aside}
        </aside>
      </div>
    </div>
  )
}
