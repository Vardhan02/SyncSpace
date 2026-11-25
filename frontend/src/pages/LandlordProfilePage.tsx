import { ContactSection } from "@/components/profile/ContactSection"
import { Avatar, InfoList, ProfileSection, SettingsLink } from "@/components/profile/ProfileParts"
import { MIN_LEASE, TENANT_TYPES, YES_NO, labelOf, landlordDefaults } from "@/lib/onboardingOptions"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { User } from "@/types"

export function LandlordProfilePage() {
  const user = useAuthStore((state) => state.user) as User
  const saved = usePreferencesStore((state) => state.records[user.id]?.landlord)
  const landlord = { ...landlordDefaults, ...saved }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
            Your profile
          </h1>
          <p className="pt-1 text-[14px] text-muted-foreground">
            Tenants only see your details after you confirm their application.
          </p>
        </div>
        <SettingsLink to="/landlord/profile/settings" />
      </div>

      <section className="flex items-center gap-4 rounded-[20px] border border-border p-5 md:p-6">
        <Avatar name={user.name} photoGroup="landlord-profile" className="size-16 text-[20px]" />
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold text-foreground">{user.name}</h2>
          <p className="text-[14px] text-muted-foreground">Landlord · {user.email}</p>
        </div>
      </section>

      <ProfileSection
        title="Tenant preferences"
        description="Who you'd like to rent to."
        editTo="/landlord/profile/edit/0"
      >
        <InfoList
          rows={[
            ["Renting to", labelOf(TENANT_TYPES, landlord.preferredTenants)],
            ["Shortest lease", labelOf(MIN_LEASE, landlord.minLeaseMonths)],
            ["References needed", labelOf(YES_NO, landlord.referencesRequired)],
          ]}
        />
      </ProfileSection>

      <ContactSection
        userId={user.id}
        email={user.email}
        description="Shared with tenants only when you confirm their application."
        toggleLabel="Include my phone number when I confirm"
      />
    </div>
  )
}
