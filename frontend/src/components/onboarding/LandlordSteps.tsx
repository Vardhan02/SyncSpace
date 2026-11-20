import { ImagePlus, X } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"
import { create } from "zustand"

import { DatePicker } from "@/components/onboarding/DatePicker"
import { SliderField } from "@/components/onboarding/SliderField"
import { CharCount, Field, MultiChoice, SingleChoice, Textarea } from "@/components/onboarding/fields"
import type { StepProps } from "@/components/onboarding/types"
import { Input } from "@/components/ui/input"
import {
  AMENITIES,
  AREAS,
  DESCRIPTION_MAX,
  GUEST_POLICIES,
  MAX_PHOTO_MB,
  MAX_PHOTOS,
  PET_POLICIES,
  QUIET_HOURS,
  RENT_MAX,
  RENT_MIN,
  ROOM_TYPES,
  ROOMS_MAX,
  ROOMS_MIN,
  RULES_MAX,
  SMOKING_POLICIES,
  TITLE_MAX,
  listingDefaults,
  today,
} from "@/lib/onboardingOptions"
import type { ListingDraft } from "@/types"

type Props = StepProps<ListingDraft>

export function DetailsStep({ values, onChange }: Props) {
  return (
    <>
      <Field label="Listing title" htmlFor="title">
        <Input
          id="title"
          maxLength={TITLE_MAX}
          placeholder="Bright double near UCC"
          value={values.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <CharCount value={values.title} max={TITLE_MAX} />
      </Field>

      <SingleChoice
        label="Area"
        options={AREAS}
        value={values.area}
        onChange={(area) => onChange({ area })}
      />

      <Field label="Address" htmlFor="address">
        <Input
          id="address"
          autoComplete="street-address"
          placeholder="12 College Road, Cork"
          value={values.address ?? ""}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </Field>

      <Field label="Rent per month">
        <SliderField
          min={RENT_MIN}
          max={RENT_MAX}
          value={[values.rent ?? listingDefaults.rent]}
          labels={["Rent per month"]}
          prefix="€"
          bigStep={50}
          onSave={([rent]) => onChange({ rent })}
        />
      </Field>

      <Field label="Rooms available">
        <SliderField
          min={ROOMS_MIN}
          max={ROOMS_MAX}
          value={[values.rooms ?? listingDefaults.rooms]}
          labels={["Rooms available"]}
          onSave={([rooms]) => onChange({ rooms })}
        />
      </Field>

      <SingleChoice
        label="Room type"
        options={ROOM_TYPES}
        value={values.roomType}
        onChange={(roomType) => onChange({ roomType })}
      />

      <Field label="Available from" htmlFor="availableFrom">
        <DatePicker
          id="availableFrom"
          min={today()}
          value={values.availableFrom}
          onChange={(availableFrom) => onChange({ availableFrom })}
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          maxLength={DESCRIPTION_MAX}
          placeholder="What's the house like? Who lives there? How far is it from campus?"
          value={values.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <CharCount value={values.description} max={DESCRIPTION_MAX} />
      </Field>
    </>
  )
}

export function AmenitiesStep({ values, onChange }: Props) {
  return (
    <MultiChoice
      label="What does the house have?"
      hint="Pick at least one. We'll check these against your photos later."
      options={AMENITIES}
      value={values.amenities}
      onChange={(amenities) => onChange({ amenities })}
    />
  )
}

export function RulesStep({ values, onChange }: Props) {
  return (
    <>
      <SingleChoice
        label="Pets"
        options={PET_POLICIES}
        value={values.petPolicy}
        onChange={(petPolicy) => onChange({ petPolicy })}
      />
      <SingleChoice
        label="Smoking"
        options={SMOKING_POLICIES}
        value={values.smokingPolicy}
        onChange={(smokingPolicy) => onChange({ smokingPolicy })}
      />
      <SingleChoice
        label="Guests"
        options={GUEST_POLICIES}
        value={values.guestPolicy}
        onChange={(guestPolicy) => onChange({ guestPolicy })}
      />
      <SingleChoice
        label="Quiet hours"
        options={QUIET_HOURS}
        value={values.quietHours}
        onChange={(quietHours) => onChange({ quietHours })}
      />
      <Field label="Anything else?" htmlFor="otherRules" hint="Optional.">
        <Textarea
          id="otherRules"
          maxLength={RULES_MAX}
          placeholder="Bins go out on Thursday, shared cleaning rota…"
          value={values.otherRules ?? ""}
          onChange={(e) => onChange({ otherRules: e.target.value })}
        />
        <CharCount value={values.otherRules} max={RULES_MAX} />
      </Field>
    </>
  )
}

type Photo = { id: string; url: string; name: string }

// Photos only live in memory until there's a backend to upload them to.
const usePhotos = create<{ photos: Photo[]; setPhotos: (photos: Photo[]) => void }>()((set) => ({
  photos: [],
  setPhotos: (photos) => set({ photos }),
}))

export function PhotosStep({ values, onChange }: Props) {
  const photos = usePhotos((state) => state.photos)
  const setPhotos = usePhotos((state) => state.setPhotos)

  useEffect(() => {
    if (values.photoCount !== photos.length) onChange({ photoCount: photos.length })
  }, [photos.length, values.photoCount, onChange])

  function addFiles(files: FileList | null) {
    if (!files) return
    const added: Photo[] = []
    let skipped = 0

    for (const file of files) {
      const valid = ["image/jpeg", "image/png"].includes(file.type)
      const small = file.size <= MAX_PHOTO_MB * 1024 * 1024
      if (!valid || !small || photos.length + added.length >= MAX_PHOTOS) {
        skipped++
        continue
      }
      added.push({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name })
    }

    if (skipped) {
      toast.error(`${skipped} photo${skipped > 1 ? "s" : ""} skipped. Use JPG or PNG under ${MAX_PHOTO_MB} MB, max ${MAX_PHOTOS} photos.`)
    }
    setPhotos([...photos, ...added])
  }

  function remove(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotos(photos.filter((item) => item.id !== id))
  }

  function makeCover(id: string) {
    const photo = photos.find((item) => item.id === id)
    if (photo) setPhotos([photo, ...photos.filter((item) => item.id !== id)])
  }

  return (
    <Field
      label="Photos"
      hint={`At least 1, up to ${MAX_PHOTOS}. The first photo is the cover.`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <div key={photo.id} className="group relative aspect-4/3 overflow-hidden rounded-[12px] bg-secondary">
            <img src={photo.url} alt={photo.name} className="size-full object-cover" />
            {index === 0 ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-foreground">
                Cover
              </span>
            ) : (
              <button
                type="button"
                className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-white"
                onClick={() => makeCover(photo.id)}
              >
                Make cover
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${photo.name}`}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
              onClick={() => remove(photo.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <label className="flex aspect-4/3 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-border text-[13px] text-muted-foreground transition-colors hover:bg-secondary">
            <ImagePlus className="size-6" aria-hidden="true" />
            Add photos
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </label>
        ) : null}
      </div>
    </Field>
  )
}
