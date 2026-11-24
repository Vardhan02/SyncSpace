import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { landlordSteps, tenantSteps } from "@/components/onboarding/steps"
import type { OnboardingStep } from "@/components/onboarding/types"
import { Button } from "@/components/ui/button"
import { landlordDefaults, tenantDefaults } from "@/lib/onboardingOptions"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { User } from "@/types"

// Only the landlord's first onboarding step is about them; the rest is the listing,
// which gets edited from My listings instead.
const LANDLORD_PROFILE_STEPS = 1

// Edits one onboarding section from the profile page, reusing the onboarding step itself.
export function ProfileEditPage() {
  const { step = "0" } = useParams()
  const user = useAuthStore((state) => state.user) as User
  const record = usePreferencesStore((state) => state.records[user.id])
  const updateTenant = usePreferencesStore((state) => state.updateTenant)
  const updateLandlord = usePreferencesStore((state) => state.updateLandlord)
  const index = Number(step)

  if (user.role === "tenant") {
    if (!(index in tenantSteps)) return <Navigate to="/profile" replace />
    return (
      <EditStep
        step={tenantSteps[index]}
        initial={{ ...tenantDefaults, ...record?.tenant }}
        backTo="/profile"
        onSave={(values) => updateTenant(user.id, values)}
      />
    )
  }

  if (index < 0 || index >= LANDLORD_PROFILE_STEPS) return <Navigate to="/landlord/profile" replace />
  return (
    <EditStep
      step={landlordSteps[index]}
      initial={{ ...landlordDefaults, ...record?.landlord }}
      backTo="/landlord/profile"
      onSave={(values) => updateLandlord(user.id, values)}
    />
  )
}

type EditStepProps<T> = {
  step: OnboardingStep<T>
  initial: Partial<T>
  backTo: string
  onSave: (values: Partial<T>) => void
}

function EditStep<T>({ step, initial, backTo, onSave }: EditStepProps<T>) {
  const navigate = useNavigate()
  // Changes stay local until Save, so Cancel really cancels.
  const [values, setValues] = useState(initial)
  const canSave = step.schema.safeParse(values).success

  function save() {
    if (!canSave) return
    onSave(values)
    toast.success("Profile updated")
    navigate(backTo)
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Profile
      </Link>

      <h1 className="pt-6 text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
        {step.title}
      </h1>
      <p className="pt-1 text-[14px] text-muted-foreground">{step.description}</p>

      <form
        className="flex flex-col gap-8 pt-8"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        noValidate
      >
        <step.Component
          values={values}
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => navigate(backTo)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave}
            className="h-12 flex-1 rounded-[12px] text-[15px] font-medium"
          >
            Save
          </Button>
        </div>
      </form>
    </div>
  )
}
