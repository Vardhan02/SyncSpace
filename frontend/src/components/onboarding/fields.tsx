import type { ComponentProps, ReactNode } from "react"

import { Label } from "@/components/ui/label"
import type { Option } from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"

type FieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <p className="text-[13px] font-medium text-foreground">{label}</p>
      )}
      {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
      <div className="pt-2">{children}</div>
    </div>
  )
}

type ChoiceProps = {
  label: string
  hint?: string
}

type SingleChoiceProps<T extends string | number | boolean> = ChoiceProps & {
  options: Option<T>[]
  value?: T
  onChange: (value: T) => void
}

export function SingleChoice<T extends string | number | boolean>({
  label,
  options,
  hint,
  value,
  onChange,
}: SingleChoiceProps<T>) {
  return (
    <Field label={label} hint={hint}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            role="radio"
            aria-checked={value === option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </Field>
  )
}

type MultiChoiceProps = ChoiceProps & {
  options: string[]
  value?: string[]
  max?: number
  onChange: (value: string[]) => void
}

export function MultiChoice({ label, options, hint, value = [], max, onChange }: MultiChoiceProps) {
  const full = max !== undefined && value.length >= max

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option))
    } else if (!full) {
      onChange([...value, option])
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option)
          return (
            <Chip
              key={option}
              aria-pressed={selected}
              selected={selected}
              disabled={full && !selected}
              onClick={() => toggle(option)}
            >
              {option}
            </Chip>
          )
        })}
      </div>
    </Field>
  )
}

type ChipProps = ComponentProps<"button"> & { selected: boolean }

function Chip({ selected, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-4 py-2 text-[14px] font-medium transition-colors disabled:opacity-40",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-foreground hover:bg-secondary",
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-[12px] border border-input bg-transparent px-3.5 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

export function CharCount({ value = "", max }: { value?: string; max: number }) {
  return (
    <p className="pt-1 text-right text-[12px] text-muted-foreground">
      {value.length}/{max}
    </p>
  )
}
