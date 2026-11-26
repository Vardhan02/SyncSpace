import { BadgeCheck, Heart, House as HouseIcon, MapPin, Pencil, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"

import { ExpandingButton } from "@/components/ExpandingButton"
import type { ListingStatus, ListingSummary } from "@/types"

const statusLabels: Record<Exclude<ListingStatus, "active">, string> = {
  draft: "Draft",
  pending: "Application pending",
  filled: "Filled",
}

type ListingCardProps = {
  listing: ListingSummary
  onShowLikes: () => void
  onDelete: () => void
}

export function ListingCard({ listing, onShowLikes, onDelete }: ListingCardProps) {
  const viewPath = `/landlord/listings/${listing.houseId}`
  const { likeCount, status } = listing

  return (
    <article className="flex flex-col overflow-hidden rounded-[16px] border border-border">
      <Link
        to={viewPath}
        aria-label={`View ${listing.title}`}
        className="relative flex h-48 items-center justify-center bg-[#e7e5de] transition-opacity hover:opacity-90"
      >
        {listing.coverPhoto ? (
          <img src={listing.coverPhoto} alt="" className="size-full object-cover" />
        ) : (
          <HouseIcon className="size-8 text-[#b4b2a9]" aria-hidden="true" />
        )}
        <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-foreground">
          {listing.verified ? (
            <>
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Verified
            </>
          ) : (
            "Checking photos"
          )}
        </span>
        {status !== "active" ? (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground">
            {statusLabels[status]}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[16px] font-semibold text-foreground">
            <Link to={viewPath} className="hover:underline">
              {listing.title}
            </Link>
          </h2>
          <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {listing.address}
          </p>
        </div>

        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">€{listing.rent}</span> per month · {listing.area}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <button
            type="button"
            className="-ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[14px] font-medium text-foreground hover:bg-secondary"
            onClick={onShowLikes}
          >
            <Heart
              className={likeCount > 0 ? "size-4 fill-red-500 text-red-500" : "size-4"}
              aria-hidden="true"
            />
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </button>

          <div className="flex items-center gap-2">
            <ExpandingButton icon={Pencil} label="Edit" to={`${viewPath}/edit`} />
            <ExpandingButton icon={Trash2} label="Delete" tone="danger" onClick={onDelete} />
          </div>
        </div>
      </div>
    </article>
  )
}
