import { z } from "zod"

import {
  AmenitiesStep,
  DetailsStep,
  LandlordProfileStep,
  PhotosStep,
  RulesStep,
} from "@/components/onboarding/LandlordSteps"
import {
  AccommodationStep,
  LifestyleStep,
  ProfileStep,
  PromptsStep,
} from "@/components/onboarding/TenantSteps"
import type { OnboardingStep } from "@/components/onboarding/types"
import {
  AGE_MAX,
  AGE_MIN,
  BIO_MAX,
  DESCRIPTION_MAX,
  OCCUPANTS_MAX,
  OCCUPANTS_MIN,
  PROMPTS_REQUIRED,
  RENT_MAX,
  RENT_MIN,
  ROOMS_MAX,
  ROOMS_MIN,
  TITLE_MAX,
} from "@/lib/onboardingOptions"
import type { LandlordOnboarding, TenantOnboarding } from "@/types"

const required = z.string().trim().min(1)
const months = z.number().int().positive()

export const tenantSteps: OnboardingStep<TenantOnboarding>[] = [
  {
    title: "About you",
    description: "This goes on your roommate card, so other tenants know who you are.",
    schema: z.object({
      photoCount: z.number().min(1),
      age: z.number().int().min(AGE_MIN).max(AGE_MAX),
      university: required,
      course: required,
      bio: required.max(BIO_MAX),
    }),
    Component: ProfileStep,
  },
  {
    title: "Where do you want to live?",
    description: "We use this to rank houses for you.",
    schema: z
      .object({
        budgetMin: z.number().int().min(0),
        budgetMax: z.number().int(),
        preferredAreas: z.array(z.string()).min(1),
        roomType: required,
        moveInDate: required,
        leaseMonths: months,
        maxHousemates: z.number().int().min(0),
      })
      .refine((value) => value.budgetMax >= value.budgetMin),
    Component: AccommodationStep,
  },
  {
    title: "How do you live?",
    description: "This is how we find roommates who suit you.",
    schema: z.object({
      sleepSchedule: required,
      noiseTolerance: z.number().int().min(1).max(5),
      cleanliness: required,
      workSchedule: required,
      socialLevel: required,
      guestFrequency: required,
      smoker: z.boolean(),
      okWithSmoking: z.boolean(),
      hasPets: z.boolean(),
      okWithPets: z.boolean(),
      interests: z.array(z.string()).min(1),
    }),
    Component: LifestyleStep,
  },
  {
    title: "A bit about you",
    description: `Pick ${PROMPTS_REQUIRED} prompts and answer them in your own words.`,
    schema: z.object({
      prompts: z
        .array(z.object({ promptId: z.number(), answer: z.string().trim().min(1) }))
        .length(PROMPTS_REQUIRED),
    }),
    Component: PromptsStep,
  },
]

export const landlordSteps: OnboardingStep<LandlordOnboarding>[] = [
  {
    title: "About you",
    description: "Tell us what kind of tenants you're looking for.",
    schema: z.object({
      preferredTenants: required,
      minLeaseMonths: months,
      referencesRequired: z.boolean(),
    }),
    Component: LandlordProfileStep,
  },
  {
    title: "Tell us about the property",
    description: "This is what tenants see first.",
    schema: z.object({
      title: required.max(TITLE_MAX),
      area: required,
      address: required,
      rent: z.number().int().min(RENT_MIN).max(RENT_MAX),
      roomType: required,
      roomsAvailable: z.number().int().min(ROOMS_MIN).max(ROOMS_MAX),
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
    schema: z
      .object({
        petsAllowed: z.boolean(),
        smokingAllowed: z.boolean(),
        guestPolicy: required,
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
        houseMinLeaseMonths: months,
        maxOccupants: z.number().int().min(OCCUPANTS_MIN).max(OCCUPANTS_MAX),
      })
      // If quiet hours start, they need an end too.
      .refine((value) => !value.quietHoursStart || Boolean(value.quietHoursEnd)),
    Component: RulesStep,
  },
  {
    title: "Add some photos",
    description: "Listings with good photos get more interest.",
    schema: z.object({ housePhotoCount: z.number().min(1) }),
    Component: PhotosStep,
  },
]
