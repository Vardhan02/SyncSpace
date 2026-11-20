import { Plus } from "lucide-react"
import { useState } from "react"

import { DatePicker } from "@/components/onboarding/DatePicker"
import { CharCount, Field, MultiChoice, SingleChoice, Textarea } from "@/components/onboarding/fields"
import { SliderField } from "@/components/onboarding/SliderField"
import type { StepProps } from "@/components/onboarding/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AREAS,
  BUDGET_CEILING,
  BUDGET_FLOOR,
  CLEANLINESS,
  GUEST_FREQUENCY,
  HOUSEMATES,
  INTERESTS,
  LEASE_LENGTHS,
  MAX_INTERESTS,
  NOISE_TOLERANCE,
  PETS,
  PROMPT_MAX_LENGTH,
  PROMPTS,
  PROMPTS_REQUIRED,
  ROOM_TYPES,
  SLEEP_SCHEDULES,
  SMOKING,
  SOCIAL_STYLES,
  STUDY_PATTERNS,
  today,
} from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"
import type { TenantPreferences } from "@/types"

type Props = StepProps<TenantPreferences>

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
        value={values.areas}
        onChange={(areas) => onChange({ areas })}
      />

      <MultiChoice
        label="Room type"
        hint="Pick everything you'd be happy with."
        options={ROOM_TYPES}
        value={values.roomTypes}
        onChange={(roomTypes) => onChange({ roomTypes })}
      />

      <Field label="Move-in date" htmlFor="moveIn">
        <DatePicker
          id="moveIn"
          min={today()}
          value={values.moveIn}
          onChange={(moveIn) => onChange({ moveIn })}
        />
      </Field>

      <SingleChoice
        label="Lease length"
        options={LEASE_LENGTHS}
        value={values.leaseLength}
        onChange={(leaseLength) => onChange({ leaseLength })}
      />

      <SingleChoice
        label="How many housemates are you comfortable with?"
        options={HOUSEMATES}
        value={values.housemates}
        onChange={(housemates) => onChange({ housemates })}
      />
    </>
  )
}

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
        label="How tidy are you?"
        options={CLEANLINESS}
        value={values.cleanliness}
        onChange={(cleanliness) => onChange({ cleanliness })}
      />
      <SingleChoice
        label="Noise"
        options={NOISE_TOLERANCE}
        value={values.noiseTolerance}
        onChange={(noiseTolerance) => onChange({ noiseTolerance })}
      />
      <SingleChoice
        label="Where do you work or study?"
        options={STUDY_PATTERNS}
        value={values.studyPattern}
        onChange={(studyPattern) => onChange({ studyPattern })}
      />
      <SingleChoice
        label="Social style"
        options={SOCIAL_STYLES}
        value={values.socialStyle}
        onChange={(socialStyle) => onChange({ socialStyle })}
      />
      <SingleChoice
        label="How often do you have guests over?"
        options={GUEST_FREQUENCY}
        value={values.guests}
        onChange={(guests) => onChange({ guests })}
      />
      <SingleChoice
        label="Smoking"
        options={SMOKING}
        value={values.smoking}
        onChange={(smoking) => onChange({ smoking })}
      />
      <SingleChoice
        label="Pets"
        options={PETS}
        value={values.pets}
        onChange={(pets) => onChange({ pets })}
      />

      <div className="flex flex-col gap-3">
        <MultiChoice
          label="Interests"
          hint={`Optional, up to ${MAX_INTERESTS}.`}
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

export function PromptsStep({ values, onChange }: Props) {
  const prompts = values.prompts ?? []
  const full = prompts.length >= PROMPTS_REQUIRED

  function togglePrompt(prompt: string) {
    if (prompts.some((item) => item.prompt === prompt)) {
      onChange({ prompts: prompts.filter((item) => item.prompt !== prompt) })
    } else if (!full) {
      onChange({ prompts: [...prompts, { prompt, answer: "" }] })
    }
  }

  function setAnswer(prompt: string, answer: string) {
    onChange({
      prompts: prompts.map((item) => (item.prompt === prompt ? { ...item, answer } : item)),
    })
  }

  return (
    <>
      <Field
        label="Choose your prompts"
        hint={`${prompts.length} of ${PROMPTS_REQUIRED} picked. These show on your roommate card.`}
      >
        <div className="flex flex-col gap-2">
          {PROMPTS.map((prompt) => {
            const selected = prompts.some((item) => item.prompt === prompt)
            return (
              <button
                key={prompt}
                type="button"
                aria-pressed={selected}
                disabled={full && !selected}
                onClick={() => togglePrompt(prompt)}
                className={cn(
                  "rounded-[12px] border px-4 py-3 text-left text-[14px] transition-colors disabled:opacity-40",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-secondary"
                )}
              >
                {prompt}
              </button>
            )
          })}
        </div>
      </Field>

      {prompts.map((item, index) => (
        <Field key={item.prompt} label={item.prompt} htmlFor={`prompt-${index}`}>
          <Textarea
            id={`prompt-${index}`}
            maxLength={PROMPT_MAX_LENGTH}
            placeholder="Keep it short and honest"
            value={item.answer}
            onChange={(e) => setAnswer(item.prompt, e.target.value)}
          />
          <CharCount value={item.answer} max={PROMPT_MAX_LENGTH} />
        </Field>
      ))}
    </>
  )
}
