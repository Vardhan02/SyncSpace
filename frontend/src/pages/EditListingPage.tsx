import { ArrowLeft, X } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { PhotoPicker } from "@/components/onboarding/PhotoPicker"
import { Field } from "@/components/onboarding/fields"
import { landlordSteps } from "@/components/onboarding/steps"
import { Button } from "@/components/ui/button"
import { useListing, useSaveListing } from "@/hooks/useListings"
import { errorMessage } from "@/lib/api"
import { MAX_PHOTOS, landlordDefaults } from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"
import { formFromListing } from "@/services/listingService"
import { forgetPhotos, usePhotoStore } from "@/stores/photoStore"
import type { LandlordOnboarding, ListingDetail } from "@/types"

// Onboarding steps 2–5 are the listing: details, amenities, rules and photos.
const listingSteps = landlordSteps.slice(1)
const photosStep = landlordSteps[4]

// Handles both /landlord/listings/new and /landlord/listings/:houseId/edit.
export function EditListingPage() {
  const { houseId } = useParams()
  if (!houseId) return <ListingForm key="new" />
  return <EditExisting houseId={Number(houseId)} />
}

function EditExisting({ houseId }: { houseId: number }) {
  const { data: listing, isPending, isError } = useListing(houseId)

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
  // Keyed so the form starts fresh if the landlord jumps to another listing.
  return <ListingForm key={listing.houseId} listing={listing} />
}

function ListingForm({ listing }: { listing?: ListingDetail }) {
  const navigate = useNavigate()
  const save = useSaveListing()
  const photoGroup = listing ? `listing-${listing.houseId}` : "listing-new"
  const picked = usePhotoStore((state) => state.groups[photoGroup]) ?? []
  const [values, setValues] = useState<Partial<LandlordOnboarding>>(() =>
    listing ? formFromListing(listing) : { ...landlordDefaults }
  )
  const [removed, setRemoved] = useState<number[]>([])
  const createdId = useRef<number | undefined>(undefined)

  const kept = (listing?.photos ?? [])
    .filter((photo) => !removed.includes(photo.photoId))
    .toSorted((a, b) => a.position - b.position)
  const form = { ...values, housePhotoCount: kept.length + picked.length }
  const invalid = listingSteps.filter((step) => !step.schema.safeParse(form).success)
  const backTo = listing ? `/landlord/listings/${listing.houseId}` : "/landlord/listings"

  function submit() {
    if (invalid.length > 0) {
      toast.error(`Check ${invalid.map((step) => step.title.toLowerCase()).join(", ")}`)
      return
    }
    save.mutate(
      {
        houseId: listing?.houseId ?? createdId.current,
        values: form as LandlordOnboarding,
        // Only ones that are still there, in case an earlier try removed some already
        removePhotoIds: removed.filter((id) => listing?.photos.some((photo) => photo.photoId === id)),
        newPhotos: picked.map((photo) => photo.file),
        keptPhotos: kept.length,
        onCreated: (id) => (createdId.current = id),
      },
      {
        onSuccess: (houseId) => {
          forgetPhotos(photoGroup)
          toast.success(listing ? "Listing updated" : "Listing added")
          navigate(`/landlord/listings/${houseId}`)
        },
        onError: (error) => toast.error(errorMessage(error)),
      }
    )
  }

  function update(patch: Partial<LandlordOnboarding>) {
    setValues((current) => ({ ...current, ...patch }))
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {listing?.title ?? "My listings"}
      </Link>

      <h1 className="pt-6 text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
        {listing ? "Edit listing" : "Add a listing"}
      </h1>
      <p className="pt-1 text-[14px] text-muted-foreground">
        {listing ? "Update what tenants see on your listing." : "Tenants can find it as soon as you save."}
      </p>

      <form
        className="flex flex-col gap-6 pt-8"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
      >
        {listingSteps.map((step) => {
          const hasError = invalid.includes(step)
          return (
            <section
              key={step.title}
              className={cn(
                "flex flex-col gap-8 rounded-[20px] border p-5 md:p-6",
                hasError ? "border-destructive/40" : "border-border"
              )}
            >
              <div>
                <h2 className="text-[18px] font-semibold text-foreground">{step.title}</h2>
                <p className={cn("pt-0.5 text-[13px]", hasError ? "text-destructive" : "text-muted-foreground")}>
                  {hasError ? "Something here still needs filling in." : step.description}
                </p>
              </div>
              {step !== photosStep ? (
                <step.Component values={values} onChange={update} />
              ) : (
                <Field label="Photos" hint={`At least 1, up to ${MAX_PHOTOS}. The first photo is the cover.`}>
                  <div className="flex flex-col gap-3">
                    {kept.length > 0 ? (
                      <SavedPhotos
                        photos={kept}
                        onRemove={(photoId) => setRemoved((ids) => [...ids, photoId])}
                      />
                    ) : null}
                    <PhotoPicker
                      group={photoGroup}
                      max={MAX_PHOTOS - kept.length}
                      count={picked.length}
                      onCountChange={() => {}}
                      showCover={kept.length === 0}
                    />
                  </div>
                </Field>
              )}
            </section>
          )
        })}

        {/* Stuck to the bottom on bigger screens. On phones the tab bar is already there,
            so the buttons just sit at the end of the form. */}
        <div className="flex gap-3 md:sticky md:bottom-6 md:z-10 md:rounded-[16px] md:border md:border-border md:bg-white/90 md:p-3 md:shadow-[0_8px_30px_rgba(44,44,42,0.10)] md:backdrop-blur">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => navigate(backTo)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending} className="h-12 flex-1 rounded-[12px] text-[15px] font-medium">
            {save.isPending ? "Saving…" : listing ? "Save changes" : "Add listing"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Photos already on the listing. Removing one only takes effect on save.
function SavedPhotos({ photos, onRemove }: { photos: ListingDetail["photos"]; onRemove: (photoId: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => (
        <div key={photo.photoId} className="relative aspect-4/3 overflow-hidden rounded-[12px] bg-secondary">
          <img src={photo.url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
          {index === 0 ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-foreground">
              Cover
            </span>
          ) : null}
          <button
            type="button"
            aria-label={`Remove photo ${index + 1}`}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
            onClick={() => onRemove(photo.photoId)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
