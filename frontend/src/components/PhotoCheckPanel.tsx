import { BadgeCheck, Check, Loader, X } from "lucide-react"

import type { ListingDetail } from "@/types"

// The landlord's view of the photo check behind the Verified badge. Tenants only see a
// listing once it's verified.
export function PhotoCheckPanel({ listing }: { listing: ListingDetail }) {
  const { verified, verificationStatus, verificationNote, amenities } = listing
  // Per-amenity results, when the check gives them (vlmVerified is null until then)
  const checkedAmenities = amenities.some((amenity) => amenity.vlmVerified !== null)

  if (verified) {
    return (
      <div className="mt-5 flex flex-col gap-2 rounded-[14px] bg-secondary p-4">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
          <BadgeCheck className="size-4" aria-hidden="true" />
          Verified listing
        </p>
        <p className="text-[13px] leading-4.75 text-muted-foreground">
          Your photos match what you listed, so tenants can find this house.
        </p>
        {checkedAmenities ? <AmenityResults listing={listing} /> : null}
      </div>
    )
  }

  if (verificationStatus === "failed") {
    return (
      <div className="mt-5 flex flex-col gap-2 rounded-[14px] border border-destructive/30 bg-destructive/5 p-4">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-destructive">
          <X className="size-4" aria-hidden="true" />
          Photo check failed
        </p>
        <p className="text-[13px] leading-4.75 text-foreground">
          {verificationNote ?? "The photos don't match the description or amenities."}
        </p>
        {checkedAmenities ? <AmenityResults listing={listing} /> : null}
        <p className="text-[12px] text-muted-foreground">
          Tenants can't see this listing yet. Add photos that clearly show what you listed, or
          edit the listing, and it gets checked again.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5 flex gap-2.5 rounded-[14px] bg-secondary p-4">
      <Loader className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-[13px] leading-4.75 text-muted-foreground">
        {verificationStatus === "pending"
          ? "We're checking your photos against the amenities you listed. Tenants can see the listing once it's verified."
          : "Add photos so we can check them against the amenities you listed. Tenants can see the listing once it's verified."}
      </p>
    </div>
  )
}

function AmenityResults({ listing }: { listing: ListingDetail }) {
  return (
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
  )
}
