import { GUEST_POLICIES, MIN_LEASE, QUIET_END, QUIET_START, labelOf } from "@/lib/onboardingOptions"
import type { HouseRules } from "@/types"

// The rule fields as the lines a house page lists
export function describeRules(rules: HouseRules) {
  return [
    rules.petsAllowed ? "Pets allowed" : "No pets",
    rules.smokingAllowed ? "Smoking allowed" : "No smoking",
    labelOf(GUEST_POLICIES, rules.guestPolicy),
    rules.quietHoursStart
      ? `Quiet from ${labelOf(QUIET_START, rules.quietHoursStart)} to ${labelOf(QUIET_END, rules.quietHoursEnd ?? undefined)}`
      : "",
    rules.minLeaseMonths > 1 ? `Shortest lease: ${labelOf(MIN_LEASE, rules.minLeaseMonths).toLowerCase()}` : "",
    `Up to ${rules.maxOccupants} ${rules.maxOccupants === 1 ? "person" : "people"} in the house`,
    ...(rules.extraRules ?? "").split("\n"),
  ]
    .map((rule) => rule.trim())
    .filter(Boolean)
}
