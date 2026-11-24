import { ContactSection } from "@/components/profile/ContactSection"
import { Avatar, EditLink, InfoList, ProfileSection } from "@/components/profile/ProfileParts"
import {
  CLEANLINESS,
  GUEST_FREQUENCY,
  HOUSEMATES,
  LEASE_MONTHS,
  NOISE_TOLERANCE,
  PROMPTS,
  ROOM_TYPES,
  SLEEP_SCHEDULES,
  SOCIAL_LEVELS,
  WORK_SCHEDULES,
  labelOf,
} from "@/lib/onboardingOptions"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { User } from "@/types"

function longDate(value?: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function yesNo(value: boolean | undefined, yes: string, no: string) {
  if (value === undefined) return ""
  return value ? yes : no
}

export function TenantProfilePage() {
  const user = useAuthStore((state) => state.user) as User
  const tenant = usePreferencesStore((state) => state.records[user.id]?.tenant) ?? {}

  const tags = [
    labelOf(SLEEP_SCHEDULES, tenant.sleepSchedule),
    labelOf(CLEANLINESS, tenant.cleanliness),
    yesNo(tenant.smoker, "Smoker", "Non-smoker"),
    yesNo(tenant.hasPets, "Has a pet", ""),
    ...(tenant.interests ?? []),
  ].filter(Boolean)

  const studies = [tenant.course, tenant.university].filter(Boolean).join(" · ")

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          Your profile
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">
          The card below is what other tenants see when they swipe.
        </p>
      </div>

      {/* Preview of the roommate card */}
      <section className="flex flex-col gap-5 rounded-[20px] border border-border p-5 shadow-[0_8px_30px_rgba(44,44,42,0.06)] md:p-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} photoGroup="tenant-profile" className="size-20 text-[24px]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-semibold tracking-[-0.3px] text-foreground">
              {user.name}
              {tenant.age ? <span className="font-normal text-muted-foreground">, {tenant.age}</span> : null}
            </h2>
            <p className="pt-0.5 text-[14px] text-muted-foreground">{studies || "Add your course and university"}</p>
          </div>
          <EditLink to="/profile/edit/0" />
        </div>

        <p className="text-[15px] leading-6 text-foreground">
          {tenant.bio || <span className="text-placeholder">No bio yet.</span>}
        </p>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-[13px] font-medium text-foreground">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-foreground">Prompts</h3>
            <EditLink to="/profile/edit/3" />
          </div>
          {tenant.prompts?.length ? (
            tenant.prompts.map((item) => (
              <div key={item.promptId} className="rounded-[14px] bg-secondary px-4 py-3">
                <p className="text-[13px] text-muted-foreground">{labelOf(PROMPTS, item.promptId)}</p>
                <p className="pt-0.5 text-[15px] text-foreground">{item.answer}</p>
              </div>
            ))
          ) : (
            <p className="text-[14px] text-placeholder">No prompts answered yet.</p>
          )}
        </div>
      </section>

      <ProfileSection
        title="Where you want to live"
        description="Used to rank houses for you."
        editTo="/profile/edit/1"
      >
        <InfoList
          rows={[
            ["Budget", tenant.budgetMin ? `€${tenant.budgetMin} – €${tenant.budgetMax} / month` : ""],
            ["Areas", tenant.preferredAreas?.join(", ")],
            ["Room type", labelOf(ROOM_TYPES, tenant.roomType)],
            ["Move in", longDate(tenant.moveInDate)],
            ["Lease", labelOf(LEASE_MONTHS, tenant.leaseMonths)],
            ["Most housemates", labelOf(HOUSEMATES, tenant.maxHousemates)],
          ]}
        />
      </ProfileSection>

      <ProfileSection
        title="How you live"
        description="Used to find roommates who suit you."
        editTo="/profile/edit/2"
      >
        <InfoList
          rows={[
            ["Sleep", labelOf(SLEEP_SCHEDULES, tenant.sleepSchedule)],
            ["Noise", labelOf(NOISE_TOLERANCE, tenant.noiseTolerance)],
            ["Tidiness", labelOf(CLEANLINESS, tenant.cleanliness)],
            ["Work / study", labelOf(WORK_SCHEDULES, tenant.workSchedule)],
            ["Social", labelOf(SOCIAL_LEVELS, tenant.socialLevel)],
            ["Guests", labelOf(GUEST_FREQUENCY, tenant.guestFrequency)],
            [
              "Smoking",
              [yesNo(tenant.smoker, "Smokes", "Doesn't smoke"), yesNo(tenant.okWithSmoking, "OK with smokers", "Not OK with smokers")]
                .filter(Boolean)
                .join(" · "),
            ],
            [
              "Pets",
              [yesNo(tenant.hasPets, "Has a pet", "No pets"), yesNo(tenant.okWithPets, "OK with pets", "Not OK with pets")]
                .filter(Boolean)
                .join(" · "),
            ],
          ]}
        />
      </ProfileSection>

      <ContactSection
        userId={user.id}
        email={user.email}
        description="Your matches see your email. Your phone is only shown if you turn it on."
        toggleLabel="Show my phone number to matches"
      />
    </div>
  )
}
