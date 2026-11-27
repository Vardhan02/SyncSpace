import { ContactSection } from "@/components/profile/ContactSection"
import { Avatar, InfoList, ProfileSection, SettingsLink } from "@/components/profile/ProfileParts"
import { Button } from "@/components/ui/button"
import { useMyLandlordProfile } from "@/hooks/useMyLandlordProfile"
import { MIN_LEASE, TENANT_TYPES, YES_NO, labelOf } from "@/lib/onboardingOptions"
import { useAuthStore } from "@/stores/authStore"
import type { User } from "@/types"

export function LandlordProfilePage() {
  const user = useAuthStore((state) => state.user) as User
  const { data: landlord, isPending, isError, refetch } = useMyLandlordProfile()

  if (isPending) {
    return <p className="py-20 text-center text-[14px] text-muted-foreground">Loading your profile…</p>
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-[15px] text-foreground">Couldn't load your profile.</p>
        <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

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
        <Avatar name={user.name} photoUrl={landlord.photoUrl} className="size-16 text-[20px]" />
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
            ["Renting to", labelOf(TENANT_TYPES, landlord.preferredTenants ?? undefined)],
            ["Shortest lease", labelOf(MIN_LEASE, landlord.minLeaseMonths ?? undefined)],
            ["References needed", labelOf(YES_NO, landlord.referencesRequired ?? undefined)],
          ]}
        />
      </ProfileSection>

      <ContactSection
        email={user.email}
        description="Shared with tenants only when you confirm their application."
        toggleLabel="Include my phone number when I confirm"
      />
    </div>
  )
}
