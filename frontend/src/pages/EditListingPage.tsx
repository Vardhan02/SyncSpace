import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { PhotoPicker } from "@/components/onboarding/PhotoPicker"
import { Field } from "@/components/onboarding/fields"
import { landlordSteps } from "@/components/onboarding/steps"
import { Button } from "@/components/ui/button"
import { useMyListings } from "@/hooks/useMyListings"
import { MAX_PHOTOS, landlordDefaults } from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"
import { formFromHouse, listingSource } from "@/services/landlordService"
import { useAuthStore } from "@/stores/authStore"
import { useLandlordStore } from "@/stores/landlordStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { LandlordOnboarding } from "@/types"

// Onboarding steps 1–4 are the listing: details, amenities, rules and photos.
const listingSteps = landlordSteps.slice(1)
const photosStep = landlordSteps[4]

// Handles both /landlord/listings/new and /landlord/listings/:houseId/edit.
export function EditListingPage() {
  const { houseId } = useParams()
  const house = useMyListings().find((listing) => listing.id === houseId)

  if (!houseId) return <ListingForm key="new" />

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

  // Keyed so the form starts fresh if the landlord jumps to another listing.
  return <ListingForm key={house.id} houseId={house.id} />
}

function ListingForm({ houseId }: { houseId?: string }) {
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.user?.id) ?? ""
  const house = useMyListings().find((listing) => listing.id === houseId)
  const onboarding = usePreferencesStore((state) => state.records[userId]?.landlord)
  const updateLandlord = usePreferencesStore((state) => state.updateLandlord)
  const added = useLandlordStore((state) => state.added.find((listing) => listing.id === houseId))
  const savedEdit = useLandlordStore((state) => (houseId ? state.edits[houseId] : undefined))
  const addListing = useLandlordStore((state) => state.addListing)
  const editListing = useLandlordStore((state) => state.editListing)

  const source = houseId ? listingSource(houseId) : "added"
  // A new listing gets its id up front so its photos are already filed under it.
  const [listingId] = useState(() => houseId ?? `l-${crypto.randomUUID().slice(0, 8)}`)
  // Photos are kept in memory per listing. The onboarding listing used the "house" group.
  const photoGroup = source === "onboarding" ? "house" : `house-${listingId}`
  const [values, setValues] = useState<Partial<LandlordOnboarding>>(() => {
    if (!houseId) return { ...landlordDefaults }
    if (source === "onboarding") return { ...landlordDefaults, ...onboarding }
    if (source === "added") return added?.form ?? {}
    return savedEdit ?? (house ? formFromHouse(house) : {})
  })

  const backTo = houseId ? `/landlord/listings/${houseId}` : "/landlord/listings"
  const invalid = listingSteps.filter((step) => !step.schema.safeParse(values).success)

  function save() {
    if (invalid.length > 0) {
      toast.error(`Check ${invalid.map((step) => step.title.toLowerCase()).join(", ")}`)
      return
    }
    if (!houseId) {
      addListing({ id: listingId, landlordId: userId, form: values })
      toast.success("Listing added")
      navigate(`/landlord/listings/${listingId}`)
      return
    }
    if (source === "onboarding") updateLandlord(userId, values)
    else editListing(houseId, values)
    toast.success("Listing updated")
    navigate(backTo)
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
        {house?.title ?? "My listings"}
      </Link>

      <h1 className="pt-6 text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
        {houseId ? "Edit listing" : "Add a listing"}
      </h1>
      <p className="pt-1 text-[14px] text-muted-foreground">
        {houseId ? "Update what tenants see on your listing." : "Tenants can find it as soon as you save."}
      </p>

      <form
        className="flex flex-col gap-6 pt-8"
        onSubmit={(e) => {
          e.preventDefault()
          save()
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
              ) : source === "sample" ? (
                // Sample listings have placeholder photos, so there's nothing real to swap out.
                <p className="text-[14px] text-muted-foreground">
                  {house?.photos} sample photos. Uploading new ones comes with the backend.
                </p>
              ) : (
                <Field label="Photos" hint={`At least 1, up to ${MAX_PHOTOS}. The first photo is the cover.`}>
                  <PhotoPicker
                    group={photoGroup}
                    max={MAX_PHOTOS}
                    count={values.housePhotoCount}
                    onCountChange={(housePhotoCount) => update({ housePhotoCount })}
                  />
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
          <Button type="submit" className="h-12 flex-1 rounded-[12px] text-[15px] font-medium">
            {houseId ? "Save changes" : "Add listing"}
          </Button>
        </div>
      </form>
    </div>
  )
}
