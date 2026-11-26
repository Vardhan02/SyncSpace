import { Heart, Pencil, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ExpandingButton } from "@/components/ExpandingButton"
import { HouseOverview } from "@/components/HouseOverview"
import { DeleteListingDialog, LikesDialog } from "@/components/ListingDialogs"
import { PhotoCheckPanel } from "@/components/PhotoCheckPanel"
import { Button } from "@/components/ui/button"
import { useLandlordApplications } from "@/hooks/useApplications"
import { useMyListings } from "@/hooks/useMyListings"
import { getLikes } from "@/services/landlordService"
import { useLandlordStore } from "@/stores/landlordStore"

// The landlord's view of one of their own listings: no like/share/apply, but edit and delete.
export function ListingDetailPage() {
  const { houseId = "" } = useParams()
  const navigate = useNavigate()
  const house = useMyListings().find((listing) => listing.id === houseId)
  const applications = useLandlordApplications()
  const deleteListing = useLandlordStore((state) => state.deleteListing)
  const [showLikes, setShowLikes] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [houseId])

  if (!house) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-[22px] font-semibold text-foreground">This listing isn't available</h1>
        <Link to="/landlord/listings" className="text-[14px] font-medium text-foreground underline">
          Back to my listings
        </Link>
      </div>
    )
  }

  const likes = getLikes(house.id)
  const applicationCount = applications.filter(
    (item) => item.house.id === house.id && !item.decision
  ).length

  function confirmDelete() {
    if (!house) return
    deleteListing(house.id)
    toast.success(`Deleted ${house.title}`)
    navigate("/landlord/listings", { replace: true })
  }

  return (
    <>
      <HouseOverview
        key={house.id}
        house={house}
        backTo="/landlord/listings"
        backLabel="My listings"
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <ExpandingButton icon={Pencil} label="Edit" to={`/landlord/listings/${house.id}/edit`} />
            <ExpandingButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleting(true)} />
          </div>
        }
        aside={
          <>
            <p className="text-[28px] font-semibold tracking-[-0.5px] text-foreground">
              €{house.rent}
              <span className="text-[15px] font-normal text-muted-foreground"> / month</span>
            </p>

            <PhotoCheckPanel house={house} />

            <Button
              variant="outline"
              className="mt-5 h-12 w-full justify-between rounded-[12px] px-4 text-[15px] font-medium"
              onClick={() => setShowLikes(true)}
            >
              <span className="flex items-center gap-2">
                <Heart
                  className={likes.length > 0 ? "size-4 fill-red-500 text-red-500" : "size-4"}
                  aria-hidden="true"
                />
                {likes.length} {likes.length === 1 ? "like" : "likes"}
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">See who</span>
            </Button>

            <Link
              to={`/landlord/applications?house=${house.id}`}
              className="mt-3 flex h-12 items-center justify-between rounded-[12px] border border-border px-4 text-[15px] font-medium text-foreground hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <Users className="size-4" aria-hidden="true" />
                Applications
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">
                {applicationCount > 0 ? `${applicationCount} new` : "View"}
              </span>
            </Link>
          </>
        }
      />

      <LikesDialog
        open={showLikes}
        title={house.title}
        names={likes}
        onClose={() => setShowLikes(false)}
      />
      <DeleteListingDialog
        open={deleting}
        title={house.title}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
      />
    </>
  )
}
