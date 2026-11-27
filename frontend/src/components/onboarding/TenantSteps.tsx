import { Plus } from "lucide-react"
import { useState } from "react"

import { DatePicker } from "@/components/onboarding/DatePicker"
import { PhotoPicker } from "@/components/onboarding/PhotoPicker"
import { SliderField } from "@/components/onboarding/SliderField"
import { CharCount, Field, MultiChoice, SingleChoice, Textarea } from "@/components/onboarding/fields"
import type { StepProps } from "@/components/onboarding/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TENANT_PHOTO_GROUP } from "@/hooks/useMyTenantProfile"
import {
  AREAS,
  BIO_MAX,
  BUDGET_CEILING,
  BUDGET_FLOOR,
  CLEANLINESS,
  GUEST_FREQUENCY,
  HOUSEMATES,
  INTERESTS,
  LEASE_MONTHS,
  MAX_INTERESTS,
  NOISE_TOLERANCE,
  PROMPT_MAX_LENGTH,
  PROMPTS,
  PROMPTS_REQUIRED,
  ROOM_TYPES,
  SLEEP_SCHEDULES,
  SOCIAL_LEVELS,
  WORK_SCHEDULES,
  YES_NO,
  today,
} from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"
import type { TenantOnboarding } from "@/types"

type Props = StepProps<TenantOnboarding>

// Saved to the tenants table. The columns allow nulls, but the roommate card needs all of it.
export function ProfileStep({ values, onChange }: Props) {
  return (
    <>
      <Field label="Profile photo" hint="Shown on your roommate card.">
        <PhotoPicker
          group={TENANT_PHOTO_GROUP}
          max={1}
          round
          count={values.photoCount}
          onCountChange={(photoCount) => onChange({ photoCount })}
          saved={values.photoUrl}
          onRemoveSaved={() => onChange({ photoUrl: undefined })}
        />
      </Field>

      <Field label="Age" htmlFor="age">
        <Input
          id="age"
          inputMode="numeric"
          placeholder="21"
          className="max-w-28"
          value={values.age ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 3)
            onChange({ age: digits ? Number(digits) : undefined })
          }}
        />
      </Field>

      <Field label="University or college" htmlFor="university">
        <Input
          id="university"
          placeholder="UCC"
          value={values.university ?? ""}
          onChange={(e) => onChange({ university: e.target.value })}
        />
      </Field>

      <Field label="Course" htmlFor="course">
        <Input
          id="course"
          placeholder="MSc Data Science"
          value={values.course ?? ""}
          onChange={(e) => onChange({ course: e.target.value })}
        />
      </Field>

      <Field label="Bio" htmlFor="bio" hint="A line or two about you.">
        <Textarea
          id="bio"
          maxLength={BIO_MAX}
          placeholder="Quiet during the week, up for a film at the weekend…"
          value={values.bio ?? ""}
          onChange={(e) => onChange({ bio: e.target.value })}
        />
        <CharCount value={values.bio} max={BIO_MAX} />
      </Field>
    </>
  )
}

// Saved to tenant_house_preferences.
export function AccommodationStep({ values, onChange }: Props) {
  return (
    <>
      <Field label="Monthly budget" hint={`Between €${BUDGET_FLOOR} and €${BUDGET_CEILING}.`}>
        <SliderField
          min={BUDGET_FLOOR}
          max={BUDGET_CEILING}
          value={[values.budgetMin ?? BUDGET_FLOOR, values.budgetMax ?? BUDGET_CEILING]}
          labels={["Minimum budget", "Maximum budget"]}
          prefix="€"
          bigStep={50}
          onSave={([budgetMin, budgetMax]) => onChange({ budgetMin, budgetMax })}
        />
      </Field>

      <MultiChoice
        label="Preferred areas"
        hint="Pick at least one."
        options={AREAS}
        value={values.preferredAreas}
        onChange={(preferredAreas) => onChange({ preferredAreas })}
      />

      <SingleChoice
        label="Room type"
        options={ROOM_TYPES}
        value={values.roomType}
        onChange={(roomType) => onChange({ roomType })}
      />

      <Field label="Move-in date" htmlFor="moveInDate">
        <DatePicker
          id="moveInDate"
          min={today()}
          value={values.moveInDate}
          onChange={(moveInDate) => onChange({ moveInDate })}
        />
      </Field>

      <SingleChoice
        label="Lease length"
        options={LEASE_MONTHS}
        value={values.leaseMonths}
        onChange={(leaseMonths) => onChange({ leaseMonths })}
      />

      <SingleChoice
        label="Most housemates you'd live with"
        options={HOUSEMATES}
        value={values.maxHousemates}
        onChange={(maxHousemates) => onChange({ maxHousemates })}
      />
    </>
  )
}

// Saved to tenant_lifestyle_preferences and tenant_interests.
export function LifestyleStep({ values, onChange }: Props) {
  const [custom, setCustom] = useState("")
  const interests = values.interests ?? []
  const options = [...INTERESTS, ...interests.filter((item) => !INTERESTS.includes(item))]

  function addCustom() {
    const interest = custom.trim()
    if (!interest || interests.includes(interest) || interests.length >= MAX_INTERESTS) return
    onChange({ interests: [...interests, interest] })
    setCustom("")
  }

  return (
    <>
      <SingleChoice
        label="Sleep schedule"
        options={SLEEP_SCHEDULES}
        value={values.sleepSchedule}
        onChange={(sleepSchedule) => onChange({ sleepSchedule })}
      />
      <SingleChoice
        label="How much noise is OK?"
        options={NOISE_TOLERANCE}
        value={values.noiseTolerance}
        onChange={(noiseTolerance) => onChange({ noiseTolerance })}
      />
      <SingleChoice
        label="How tidy are you?"
        options={CLEANLINESS}
        value={values.cleanliness}
        onChange={(cleanliness) => onChange({ cleanliness })}
      />
      <SingleChoice
        label="Where do you work or study?"
        options={WORK_SCHEDULES}
        value={values.workSchedule}
        onChange={(workSchedule) => onChange({ workSchedule })}
      />
      <SingleChoice
        label="Social style"
        options={SOCIAL_LEVELS}
        value={values.socialLevel}
        onChange={(socialLevel) => onChange({ socialLevel })}
      />
      <SingleChoice
        label="How often do you have guests over?"
        options={GUEST_FREQUENCY}
        value={values.guestFrequency}
        onChange={(guestFrequency) => onChange({ guestFrequency })}
      />
      <SingleChoice
        label="Do you smoke?"
        options={YES_NO}
        value={values.smoker}
        onChange={(smoker) => onChange({ smoker })}
      />
      <SingleChoice
        label="Are you OK living with someone who smokes?"
        options={YES_NO}
        value={values.okWithSmoking}
        onChange={(okWithSmoking) => onChange({ okWithSmoking })}
      />
      <SingleChoice
        label="Do you have a pet?"
        options={YES_NO}
        value={values.hasPets}
        onChange={(hasPets) => onChange({ hasPets })}
      />
      <SingleChoice
        label="Are you OK living with pets?"
        options={YES_NO}
        value={values.okWithPets}
        onChange={(okWithPets) => onChange({ okWithPets })}
      />

      <div className="flex flex-col gap-3">
        <MultiChoice
          label="Interests"
          hint={`Pick at least 1, up to ${MAX_INTERESTS}.`}
          options={options}
          max={MAX_INTERESTS}
          value={interests}
          onChange={(next) => onChange({ interests: next })}
        />
        <div className="flex gap-2">
          <Input
            aria-label="Add your own interest"
            placeholder="Add your own"
            maxLength={24}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-[12px] px-4"
            disabled={!custom.trim() || interests.length >= MAX_INTERESTS}
            onClick={addCustom}
          >
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>
      </div>
    </>
  )
}

// Saved to tenant_prompt_answers, one row per slot (1–3).
export function PromptsStep({ values, onChange }: Props) {
  const prompts = values.prompts ?? []
  const full = prompts.length >= PROMPTS_REQUIRED

  function togglePrompt(promptId: number) {
    if (prompts.some((item) => item.promptId === promptId)) {
      onChange({ prompts: prompts.filter((item) => item.promptId !== promptId) })
    } else if (!full) {
      onChange({ prompts: [...prompts, { promptId, answer: "" }] })
    }
  }

  function setAnswer(promptId: number, answer: string) {
    onChange({
      prompts: prompts.map((item) => (item.promptId === promptId ? { ...item, answer } : item)),
    })
  }

  const promptText = (promptId: number) => PROMPTS.find((item) => item.value === promptId)?.label ?? ""

  return (
    <>
      <Field
        label="Choose your prompts"
        hint={`${prompts.length} of ${PROMPTS_REQUIRED} picked. These show on your roommate card.`}
      >
        <div className="flex flex-col gap-2">
          {PROMPTS.map((prompt) => {
            const selected = prompts.some((item) => item.promptId === prompt.value)
            return (
              <button
                key={prompt.value}
                type="button"
                aria-pressed={selected}
                disabled={full && !selected}
                onClick={() => togglePrompt(prompt.value)}
                className={cn(
                  "rounded-[12px] border px-4 py-3 text-left text-[14px] transition-colors disabled:opacity-40",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-secondary"
                )}
              >
                {prompt.label}
              </button>
            )
          })}
        </div>
      </Field>

      {prompts.map((item) => (
        <Field key={item.promptId} label={promptText(item.promptId)} htmlFor={`prompt-${item.promptId}`}>
          <Textarea
            id={`prompt-${item.promptId}`}
            maxLength={PROMPT_MAX_LENGTH}
            placeholder="Keep it short and honest"
            value={item.answer}
            onChange={(e) => setAnswer(item.promptId, e.target.value)}
          />
          <CharCount value={item.answer} max={PROMPT_MAX_LENGTH} />
        </Field>
      ))}
    </>
  )
}
