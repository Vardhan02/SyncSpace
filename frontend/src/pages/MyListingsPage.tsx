import { House as HouseIcon, Plus } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { DeleteListingDialog, LikesDialog } from "@/components/ListingDialogs"
import { ListingCard } from "@/components/ListingCard"
import { Button } from "@/components/ui/button"
import { useDeleteListing, useMyListingSummaries } from "@/hooks/useListings"
import { errorMessage } from "@/lib/api"
import type { ListingSummary } from "@/types"

export function MyListingsPage() {
  const { data: listings, isPending, isError, refetch } = useMyListingSummaries()
  const removeListing = useDeleteListing()
  const [likesFor, setLikesFor] = useState<ListingSummary | null>(null)
  const [deleting, setDeleting] = useState<ListingSummary | null>(null)

  function confirmDelete() {
    if (!deleting) return
    removeListing.mutate(deleting.houseId, {
      onSuccess: () => {
        toast.success(`Deleted ${deleting.title}`)
        setDeleting(null)
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  const totalLikes = listings?.reduce((sum, listing) => sum + listing.likeCount, 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
            My listings
          </h1>
          {listings ? (
            <p className="pt-1 text-[14px] text-muted-foreground">
              {listings.length} {listings.length === 1 ? "listing" : "listings"} · {totalLikes}{" "}
              {totalLikes === 1 ? "like" : "likes"} from tenants
            </p>
          ) : null}
        </div>
        <Link
          to="/landlord/listings/new"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground hover:bg-primary/85"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add listing
        </Link>
      </div>

      {isPending ? (
        <p className="py-16 text-center text-[14px] text-muted-foreground">Loading your listings…</p>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[15px] text-foreground">Couldn't load your listings.</p>
          <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.houseId}
              listing={listing}
              onShowLikes={() => setLikesFor(listing)}
              onDelete={() => setDeleting(listing)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
          <HouseIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="pt-3 text-[16px] font-semibold text-foreground">No listings yet</p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            Add a house and tenants can start finding it.
          </p>
        </div>
      )}

      <LikesDialog houseId={likesFor?.houseId ?? null} title={likesFor?.title ?? ""} onClose={() => setLikesFor(null)} />
      <DeleteListingDialog
        open={deleting !== null}
        title={deleting?.title ?? ""}
        deleting={removeListing.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
