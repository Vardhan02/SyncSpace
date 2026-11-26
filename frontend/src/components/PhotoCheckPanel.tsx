import { BadgeCheck, Check, Loader, X } from "lucide-react"

import { getPhotoCheck } from "@/services/landlordService"
import type { House } from "@/types"

// The landlord's view of the photo check behind the Verified badge.
export function PhotoCheckPanel({ house }: { house: House }) {
  const check = getPhotoCheck(house)

  if (check.status === "checking") {
    return (
      <div className="mt-5 flex gap-2.5 rounded-[14px] bg-secondary p-4">
        <Loader className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-[13px] leading-4.75 text-muted-foreground">
          We're checking your photos against the amenities you listed. Your listing gets a
          Verified badge once they match.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-[14px] bg-secondary p-4">
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
        {check.verified ? <BadgeCheck className="size-4" aria-hidden="true" /> : null}
        {check.verified ? "Verified listing" : "Not verified yet"}
      </p>
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {house.amenities.map((amenity) => {
          const seen = !check.notSeen.includes(amenity)
          return (
            <li key={amenity} className="flex items-center gap-2 text-foreground">
              {seen ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <X className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className={seen ? undefined : "text-muted-foreground"}>
                {amenity}
                {seen ? null : " · not seen in your photos"}
              </span>
            </li>
          )
        })}
        <li className="flex items-center gap-2 text-foreground">
          {check.goodPhotos ? (
            <Check className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <X className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <span className={check.goodPhotos ? undefined : "text-muted-foreground"}>
            {check.goodPhotos ? "Photos are clear and well lit" : "Some photos are too dark or blurry"}
          </span>
        </li>
      </ul>
      {check.verified ? null : (
        <p className="text-[12px] text-muted-foreground">
          Add photos that show these clearly to get the Verified badge.
        </p>
      )}
    </div>
  )
}
