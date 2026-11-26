import { BadgeCheck, Check, Loader, X } from "lucide-react"

import type { ListingDetail } from "@/types"

// The landlord's view of the photo check behind the Verified badge. Each amenity's
// vlmVerified is null until the check has looked at the photos.
export function PhotoCheckPanel({ listing }: { listing: ListingDetail }) {
  const checked = listing.amenities.some((amenity) => amenity.vlmVerified !== null)

  if (!checked) {
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
        {listing.verified ? <BadgeCheck className="size-4" aria-hidden="true" /> : null}
        {listing.verified ? "Verified listing" : "Not verified yet"}
      </p>
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {listing.amenities.map(({ name, vlmVerified }) => (
          <li key={name} className="flex items-center gap-2 text-foreground">
            {vlmVerified ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <span className={vlmVerified ? undefined : "text-muted-foreground"}>
              {name}
              {vlmVerified ? null : vlmVerified === false ? " · not seen in your photos" : " · not checked yet"}
            </span>
          </li>
        ))}
      </ul>
      {listing.verified ? null : (
        <p className="text-[12px] text-muted-foreground">
          Add photos that show these clearly to get the Verified badge.
        </p>
      )}
    </div>
  )
}
