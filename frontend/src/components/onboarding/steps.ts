import { z } from "zod"

import { AmenitiesStep, DetailsStep, PhotosStep, RulesStep } from "@/components/onboarding/LandlordSteps"
import { AccommodationStep, LifestyleStep, PromptsStep } from "@/components/onboarding/TenantSteps"
import type { OnboardingStep } from "@/components/onboarding/types"
import {
  DESCRIPTION_MAX,
  PROMPTS_REQUIRED,
  RENT_MAX,
  RENT_MIN,
  ROOMS_MAX,
  ROOMS_MIN,
  TITLE_MAX,
} from "@/lib/onboardingOptions"
import type { ListingDraft, TenantPreferences } from "@/types"

const required = z.string().trim().min(1)

export const tenantDefaults: Partial<TenantPreferences> = {
  budgetMin: 500,
  budgetMax: 900,
}

export const tenantSteps: OnboardingStep<TenantPreferences>[] = [
  {
    title: "Where do you want to live?",
    description: "We use this to rank houses for you.",
    schema: z.object({
      budgetMin: z.number(),
      budgetMax: z.number(),
      areas: z.array(z.string()).min(1),
      roomTypes: z.array(z.string()).min(1),
      moveIn: required,
      leaseLength: required,
      housemates: required,
    }),
    Component: AccommodationStep,
  },
  {
    title: "How do you live?",
    description: "This is how we find roommates who suit you.",
    schema: z.object({
      sleepSchedule: required,
      cleanliness: required,
      noiseTolerance: required,
      studyPattern: required,
      socialStyle: required,
      guests: required,
      smoking: required,
      pets: required,
    }),
    Component: LifestyleStep,
  },
  {
    title: "A bit about you",
    description: `Pick ${PROMPTS_REQUIRED} prompts and answer them in your own words.`,
    schema: z.object({
      prompts: z
        .array(z.object({ answer: z.string().trim().min(1) }))
        .length(PROMPTS_REQUIRED),
    }),
    Component: PromptsStep,
  },
]

export const landlordSteps: OnboardingStep<ListingDraft>[] = [
  {
    title: "Tell us about the property",
    description: "This is what tenants see first.",
    schema: z.object({
      title: required.max(TITLE_MAX),
      area: required,
      address: required,
      rent: z.number().min(RENT_MIN).max(RENT_MAX),
      roomType: required,
      rooms: z.number().int().min(ROOMS_MIN).max(ROOMS_MAX),
      availableFrom: required,
      description: required.max(DESCRIPTION_MAX),
    }),
    Component: DetailsStep,
  },
  {
    title: "Amenities",
    description: "Tick everything the house offers.",
    schema: z.object({ amenities: z.array(z.string()).min(1) }),
    Component: AmenitiesStep,
  },
  {
    title: "House rules",
    description: "So tenants know what to expect before they apply.",
    schema: z.object({
      petPolicy: required,
      smokingPolicy: required,
      guestPolicy: required,
      quietHours: required,
    }),
    Component: RulesStep,
  },
  {
    title: "Add some photos",
    description: "Listings with good photos get more interest.",
    schema: z.object({ photoCount: z.number().min(1) }),
    Component: PhotosStep,
  },
]
