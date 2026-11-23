import { House as HouseIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DeleteListingDialog, LikesDialog } from "@/components/ListingDialogs"
import { ListingCard } from "@/components/ListingCard"
import { useMyListings } from "@/hooks/useMyListings"
import { getLikes } from "@/services/landlordService"
import { useLandlordStore } from "@/stores/landlordStore"
import type { House } from "@/types"

export function MyListingsPage() {
  const listings = useMyListings()
  const deleteListing = useLandlordStore((state) => state.deleteListing)
  const [likesFor, setLikesFor] = useState<House | null>(null)
  const [deleting, setDeleting] = useState<House | null>(null)

  const totalLikes = listings.reduce((sum, house) => sum + getLikes(house.id).length, 0)

  function confirmDelete() {
    if (!deleting) return
    deleteListing(deleting.id)
    toast.success(`Deleted ${deleting.title}`)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          My listings
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">
          {listings.length} {listings.length === 1 ? "listing" : "listings"} · {totalLikes}{" "}
          {totalLikes === 1 ? "like" : "likes"} from tenants
        </p>
      </div>

      {listings.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((house) => (
            <ListingCard
              key={house.id}
              house={house}
              likeCount={getLikes(house.id).length}
              onShowLikes={() => setLikesFor(house)}
              onDelete={() => setDeleting(house)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
          <HouseIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="pt-3 text-[16px] font-semibold text-foreground">No listings yet</p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            Your houses will show up here once you list them.
          </p>
        </div>
      )}

      <LikesDialog
        open={likesFor !== null}
        title={likesFor?.title ?? ""}
        names={likesFor ? getLikes(likesFor.id) : []}
        onClose={() => setLikesFor(null)}
      />
      <DeleteListingDialog
        open={deleting !== null}
        title={deleting?.title ?? ""}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
