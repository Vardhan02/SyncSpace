import { useEffect } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Logo } from "@/components/Logo"
import { landlordSteps, tenantDefaults, tenantSteps } from "@/components/onboarding/steps"
import type { OnboardingStep } from "@/components/onboarding/types"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"
import { listingDefaults } from "@/lib/onboardingOptions"
import { emptyRecord, usePreferencesStore } from "@/stores/preferencesStore"
import type { User } from "@/types"

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user) as User
  const logout = useAuthStore((state) => state.logout)
  const record = usePreferencesStore((state) => state.records[user.id]) ?? emptyRecord
  const setStep = usePreferencesStore((state) => state.setStep)
  const updateTenant = usePreferencesStore((state) => state.updateTenant)
  const updateListing = usePreferencesStore((state) => state.updateListing)
  const complete = usePreferencesStore((state) => state.complete)

  const tenantValues = { ...tenantDefaults, ...record.tenant }
  const listingValues = { ...listingDefaults, ...record.listing }

  function finish() {
    // Sliders show defaults before they're touched, so save what was on screen.
    if (user.role === "tenant") updateTenant(user.id, tenantValues)
    else updateListing(user.id, listingValues)
    complete(user.id)
    toast.success("You're all set")
    navigate(user.role === "tenant" ? "/houses" : "/landlord", { replace: true })
  }

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const header = (
    <header>
      <div className="mx-auto flex max-w-300 items-center justify-between px-5 py-3 md:px-8">
        <Logo className="text-foreground" />
        <Button
          variant="ghost"
          className="h-9 rounded-[10px] px-3 text-[14px] font-medium"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </header>
  )

  return (
    <div className="min-h-dvh bg-white">
      {user.role === "tenant" ? (
        <StepFlow
          header={header}
          steps={tenantSteps}
          step={record.step}
          values={tenantValues}
          onChange={(patch) => updateTenant(user.id, patch)}
          onStep={(step) => setStep(user.id, step)}
          onFinish={finish}
        />
      ) : (
        <StepFlow
          header={header}
          steps={landlordSteps}
          step={record.step}
          values={listingValues}
          onChange={(patch) => updateListing(user.id, patch)}
          onStep={(step) => setStep(user.id, step)}
          onFinish={finish}
        />
      )}
    </div>
  )
}

type StepFlowProps<T> = {
  header: ReactNode
  steps: OnboardingStep<T>[]
  step: number
  values: Partial<T>
  onChange: (patch: Partial<T>) => void
  onStep: (step: number) => void
  onFinish: () => void
}

function StepFlow<T>({ header, steps, step, values, onChange, onStep, onFinish }: StepFlowProps<T>) {
  const index = Math.min(step, steps.length - 1)
  const current = steps[index]
  const isLast = index === steps.length - 1
  const canContinue = current.schema.safeParse(values).success

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  function next() {
    if (!canContinue) return
    if (isLast) onFinish()
    else onStep(index + 1)
  }

  return (
    <>
      {/* Header and progress stick together so the step is always visible. */}
      <div className="sticky top-0 z-40 border-b border-border bg-white">
        {header}
        <div className="mx-auto flex max-w-xl flex-col gap-2 px-5 pb-3">
          <p className="text-[13px] font-medium text-muted-foreground">
            Step {index + 1} of {steps.length}
          </p>
          <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
            className="h-1 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-5 pt-8 pb-32 md:pt-10">
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          {current.title}
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">{current.description}</p>

        <form
          className="flex flex-col gap-8 pt-8"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
          noValidate
        >
          <current.Component values={values} onChange={onChange} />

          <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white md:static md:border-0 md:pt-2">
            <div className="mx-auto flex max-w-xl gap-3 px-5 py-4 md:px-0">
              {index > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 rounded-[12px] text-[15px] font-medium"
                  onClick={() => onStep(index - 1)}
                >
                  Back
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={!canContinue}
                className="h-12 flex-1 rounded-[12px] text-[15px] font-medium"
              >
                {isLast ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
