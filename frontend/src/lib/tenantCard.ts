import {
  CLEANLINESS,
  GUEST_FREQUENCY,
  LEASE_MONTHS,
  NOISE_TOLERANCE,
  PROMPTS,
  SLEEP_SCHEDULES,
  SOCIAL_LEVELS,
  WORK_SCHEDULES,
  labelOf,
} from "@/lib/onboardingOptions"
import type { TenantOnboarding, TenantPreferences } from "@/types"

// Onboarding saves database values (e.g. "early_bird", noise 3). Roommate cards show
// labels ("Early bird"), so this turns a tenant's answers into the card's shape.
export function cardFromOnboarding(onboarding: Partial<TenantOnboarding>): TenantPreferences {
  return {
    budgetMin: onboarding.budgetMin ?? 0,
    budgetMax: onboarding.budgetMax ?? 0,
    areas: onboarding.preferredAreas ?? [],
    moveIn: onboarding.moveInDate ?? "",
    leaseLength: labelOf(LEASE_MONTHS, onboarding.leaseMonths),
    sleepSchedule: labelOf(SLEEP_SCHEDULES, onboarding.sleepSchedule),
    cleanliness: labelOf(CLEANLINESS, onboarding.cleanliness),
    noiseTolerance: labelOf(NOISE_TOLERANCE, onboarding.noiseTolerance),
    studyPattern: labelOf(WORK_SCHEDULES, onboarding.workSchedule),
    socialStyle: labelOf(SOCIAL_LEVELS, onboarding.socialLevel),
    guests: labelOf(GUEST_FREQUENCY, onboarding.guestFrequency),
    smoking: onboarding.smoker ? "Smoker" : "Non-smoker",
    pets: onboarding.hasPets ? "Has a pet" : "No pets",
    interests: onboarding.interests ?? [],
    prompts: (onboarding.prompts ?? []).map((item) => ({
      prompt: labelOf(PROMPTS, item.promptId),
      answer: item.answer,
    })),
  }
}
