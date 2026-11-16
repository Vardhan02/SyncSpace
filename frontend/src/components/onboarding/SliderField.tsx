import { useState } from "react"

import { RangeSlider } from "@/components/onboarding/RangeSlider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SliderFieldProps = {
  min: number
  max: number
  // One value for a plain slider, two for a min–max range.
  value: number[]
  // One label per value, used for the typed boxes and screen readers.
  labels: string[]
  prefix?: string
  bigStep?: number
  onSave: (value: number[]) => void
}

export function SliderField({ min, max, value, labels, prefix, bigStep, onSave }: SliderFieldProps) {
  // Kept locally while dragging so the slider stays smooth, then saved on release.
  const [values, setValues] = useState(value)
  const [drafts, setDrafts] = useState(value.map(String))
  const isRange = value.length === 2

  // A value can't pass its neighbour, so min stays below max.
  const lowerBound = (index: number) => (index > 0 ? values[index - 1] : min)
  const upperBound = (index: number) => (index < values.length - 1 ? values[index + 1] : max)

  function update(next: number[]) {
    setValues(next)
    setDrafts(next.map(String))
  }

  function type(index: number, text: string) {
    const digits = text.replace(/\D/g, "").slice(0, String(max).length)
    setDrafts((current) => current.map((item, i) => (i === index ? digits : item)))

    // Move the slider while typing if the number already makes sense.
    const amount = Number(digits)
    if (digits !== "" && amount >= lowerBound(index) && amount <= upperBound(index)) {
      setValues((current) => current.map((item, i) => (i === index ? amount : item)))
    }
  }

  function commit(index: number) {
    const typed = Number(drafts[index]) || values[index]
    const amount = Math.min(Math.max(typed, lowerBound(index)), upperBound(index))
    const next = values.map((item, i) => (i === index ? amount : item))
    update(next)
    onSave(next)
  }

  const boxes = values.map((_, index) => (
    <div key={labels[index]} className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-foreground">
          {prefix}
        </span>
      ) : null}
      <Input
        inputMode="numeric"
        aria-label={labels[index]}
        className={cn(prefix && "pl-7")}
        value={drafts[index]}
        onChange={(e) => type(index, e.target.value)}
        onBlur={() => commit(index)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit(index)
          }
        }}
      />
    </div>
  ))

  const slider = (
    <RangeSlider
      min={min}
      max={max}
      value={values}
      thumbLabels={labels}
      bigStep={bigStep}
      formatValue={(amount) => `${prefix ?? ""}${amount}`}
      onChange={update}
      onCommit={onSave}
    />
  )

  if (!isRange) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-1">{slider}</div>
        <div className="w-28 shrink-0">{boxes[0]}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {slider}
      <div className="grid grid-cols-2 gap-3">
        {boxes.map((box, index) => (
          <label key={index} className="flex flex-col gap-1 text-[12px] text-muted-foreground">
            {labels[index]}
            {box}
          </label>
        ))}
      </div>
    </div>
  )
}
