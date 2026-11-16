import type { ComponentType } from "react"
import type { z } from "zod"

export type StepProps<T> = {
  values: Partial<T>
  onChange: (patch: Partial<T>) => void
}

export type OnboardingStep<T> = {
  title: string
  description: string
  schema: z.ZodType
  Component: ComponentType<StepProps<T>>
}
