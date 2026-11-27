import { Heart, Pencil, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ExpandingButton } from "@/components/ExpandingButton"
import { HouseOverview } from "@/components/HouseOverview"
import { DeleteListingDialog, LikesDialog } from "@/components/ListingDialogs"
import { PhotoCheckPanel } from "@/components/PhotoCheckPanel"
import { Button } from "@/components/ui/button"
import { useDeleteListing, useListing } from "@/hooks/useListings"
import { errorMessage } from "@/lib/api"
import { describeRules } from "@/lib/houseRules"
import { ROOM_TYPES, labelOf } from "@/lib/onboardingOptions"

// The landlord's view of one of their own listings: no like/share/apply, but edit and delete.
export function ListingDetailPage() {
  const houseId = Number(useParams().houseId)
  const navigate = useNavigate()
  const { data: listing, isPending, isError } = useListing(houseId)
  const removeListing = useDeleteListing()
  const [showLikes, setShowLikes] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [houseId])

  if (isPending && Number.isInteger(houseId)) {
    return <p className="py-20 text-center text-[14px] text-muted-foreground">Loading…</p>
  }

  if (isError || !listing) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-[22px] font-semibold text-foreground">This listing isn't available</h1>
        <Link to="/landlord/listings" className="text-[14px] font-medium text-foreground underline">
          Back to my listings
        </Link>
      </div>
    )
  }

  function confirmDelete() {
    if (!listing) return
    removeListing.mutate(listing.houseId, {
      onSuccess: () => {
        toast.success(`Deleted ${listing.title}`)
        navigate("/landlord/listings", { replace: true })
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  return (
    <>
      <HouseOverview
        key={listing.houseId}
        house={{
          ...listing,
          roomType: labelOf(ROOM_TYPES, listing.roomType),
          rooms: listing.roomsAvailable,
          amenities: listing.amenities.map((amenity) => amenity.name),
          rules: describeRules(listing),
          photos: listing.photos.toSorted((a, b) => a.position - b.position).map((photo) => photo.url),
        }}
        backTo="/landlord/listings"
        backLabel="My listings"
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <ExpandingButton icon={Pencil} label="Edit" to={`/landlord/listings/${listing.houseId}/edit`} />
            <ExpandingButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleting(true)} />
          </div>
        }
        aside={
          <>
            <p className="text-[28px] font-semibold tracking-[-0.5px] text-foreground">
              €{listing.rent}
              <span className="text-[15px] font-normal text-muted-foreground"> / month</span>
            </p>

            <PhotoCheckPanel listing={listing} />

            <Button
              variant="outline"
              className="mt-5 h-12 w-full justify-between rounded-[12px] px-4 text-[15px] font-medium"
              onClick={() => setShowLikes(true)}
            >
              <span className="flex items-center gap-2">
                <Heart
                  className={listing.likeCount > 0 ? "size-4 fill-red-500 text-red-500" : "size-4"}
                  aria-hidden="true"
                />
                {listing.likeCount} {listing.likeCount === 1 ? "like" : "likes"}
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">See who</span>
            </Button>
          </>
        }
      />

      <LikesDialog
        houseId={showLikes ? listing.houseId : null}
        title={listing.title}
        onClose={() => setShowLikes(false)}
      />
      <DeleteListingDialog
        open={deleting}
        title={listing.title}
        deleting={removeListing.isPending}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
      />
    </>
  )
}
