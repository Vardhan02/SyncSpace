import { DatePicker } from "@/components/onboarding/DatePicker"
import { PhotoPicker } from "@/components/onboarding/PhotoPicker"
import { SliderField } from "@/components/onboarding/SliderField"
import { CharCount, Field, MultiChoice, SingleChoice, Textarea } from "@/components/onboarding/fields"
import type { StepProps } from "@/components/onboarding/types"
import { Input } from "@/components/ui/input"
import {
  AMENITIES,
  AREA_OPTIONS,
  DESCRIPTION_MAX,
  GUEST_POLICIES,
  MAX_PHOTOS,
  MIN_LEASE,
  OCCUPANTS_MAX,
  OCCUPANTS_MIN,
  QUIET_END,
  QUIET_START,
  RENT_MAX,
  RENT_MIN,
  ROOM_TYPES,
  ROOMS_MAX,
  ROOMS_MIN,
  RULES_MAX,
  TENANT_TYPES,
  TITLE_MAX,
  YES_NO,
  landlordDefaults,
  today,
} from "@/lib/onboardingOptions"
import { HOUSE_PHOTO_GROUP, LANDLORD_PHOTO_GROUP } from "@/hooks/useMyLandlordProfile"
import type { LandlordOnboarding } from "@/types"

type Props = StepProps<LandlordOnboarding>

// Saved to landlords and landlord_preferences.
export function LandlordProfileStep({ values, onChange }: Props) {
  return (
    <>
      <Field label="Profile photo" hint="Optional. Tenants see it once you accept their application.">
        <PhotoPicker
          group={LANDLORD_PHOTO_GROUP}
          max={1}
          round
          count={values.photoCount}
          onCountChange={(photoCount) => onChange({ photoCount })}
          saved={values.photoUrl}
          onRemoveSaved={() => onChange({ photoUrl: undefined })}
        />
      </Field>
      <SingleChoice
        label="Who would you like to rent to?"
        options={TENANT_TYPES}
        value={values.preferredTenants}
        onChange={(preferredTenants) => onChange({ preferredTenants })}
      />
      <SingleChoice
        label="Shortest lease you'll accept"
        options={MIN_LEASE}
        value={values.minLeaseMonths}
        onChange={(minLeaseMonths) => onChange({ minLeaseMonths })}
      />
      <SingleChoice
        label="Do tenants need references?"
        options={YES_NO}
        value={values.referencesRequired}
        onChange={(referencesRequired) => onChange({ referencesRequired })}
      />
    </>
  )
}

// Saved to houses.
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
        options={AREA_OPTIONS}
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
          value={[values.rent ?? landlordDefaults.rent]}
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
          value={[values.roomsAvailable ?? landlordDefaults.roomsAvailable]}
          labels={["Rooms available"]}
          onSave={([roomsAvailable]) => onChange({ roomsAvailable })}
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

// Saved to house_amenities.
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

const NO_QUIET_HOURS = [{ value: "", label: "No quiet hours" }, ...QUIET_START]

// Saved to house_preferences.
export function RulesStep({ values, onChange }: Props) {
  return (
    <>
      <SingleChoice
        label="Are pets allowed?"
        options={YES_NO}
        value={values.petsAllowed}
        onChange={(petsAllowed) => onChange({ petsAllowed })}
      />
      <SingleChoice
        label="Is smoking allowed?"
        options={YES_NO}
        value={values.smokingAllowed}
        onChange={(smokingAllowed) => onChange({ smokingAllowed })}
      />
      <SingleChoice
        label="Guests"
        options={GUEST_POLICIES}
        value={values.guestPolicy}
        onChange={(guestPolicy) => onChange({ guestPolicy })}
      />
      <SingleChoice
        label="Quiet hours start"
        options={NO_QUIET_HOURS}
        value={values.quietHoursStart ?? ""}
        onChange={(quietHoursStart) =>
          onChange(quietHoursStart ? { quietHoursStart } : { quietHoursStart: "", quietHoursEnd: undefined })
        }
      />
      {values.quietHoursStart ? (
        <SingleChoice
          label="Quiet hours end"
          options={QUIET_END}
          value={values.quietHoursEnd}
          onChange={(quietHoursEnd) => onChange({ quietHoursEnd })}
        />
      ) : null}
      <SingleChoice
        label="Shortest lease for this house"
        options={MIN_LEASE}
        value={values.houseMinLeaseMonths}
        onChange={(houseMinLeaseMonths) => onChange({ houseMinLeaseMonths })}
      />
      <Field label="Most people living in the house">
        <SliderField
          min={OCCUPANTS_MIN}
          max={OCCUPANTS_MAX}
          value={[values.maxOccupants ?? landlordDefaults.maxOccupants]}
          labels={["Most people living in the house"]}
          onSave={([maxOccupants]) => onChange({ maxOccupants })}
        />
      </Field>
      <Field label="Anything else?" htmlFor="extraRules" hint="Optional.">
        <Textarea
          id="extraRules"
          maxLength={RULES_MAX}
          placeholder="Bins go out on Thursday, shared cleaning rota…"
          value={values.extraRules ?? ""}
          onChange={(e) => onChange({ extraRules: e.target.value })}
        />
        <CharCount value={values.extraRules} max={RULES_MAX} />
      </Field>
    </>
  )
}

// Saved to house_photos; position is the order shown here.
export function PhotosStep({ values, onChange }: Props) {
  return (
    <Field label="Photos" hint={`At least 1, up to ${MAX_PHOTOS}. The first photo is the cover.`}>
      <PhotoPicker
        group={HOUSE_PHOTO_GROUP}
        max={MAX_PHOTOS}
        count={values.housePhotoCount}
        onCountChange={(housePhotoCount) => onChange({ housePhotoCount })}
      />
    </Field>
  )
}
