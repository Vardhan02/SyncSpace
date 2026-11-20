import { useId, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"

import { cn } from "@/lib/utils"

type RangeSliderProps = {
  min: number
  max: number
  // One value for a plain slider, two for a min–max range.
  value: number[]
  thumbLabels: string[]
  bigStep?: number
  formatValue?: (value: number) => string
  onChange: (value: number[]) => void
  // Called once a drag or key press is finished, for saving.
  onCommit?: (value: number[]) => void
}

export function RangeSlider({
  min,
  max,
  value,
  thumbLabels,
  bigStep = 10,
  formatValue = String,
  onChange,
  onCommit,
}: RangeSliderProps) {
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  // Tracks the value between pointer events, before React has re-rendered.
  const latest = useRef(value)
  const isRange = value.length === 2

  const percent = (n: number) => ((n - min) / (max - min)) * 100

  function valueAt(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect()
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return Math.round(min + ratio * (max - min))
  }

  function move(thumb: number, next: number) {
    const current = latest.current
    const low = thumb > 0 ? current[thumb - 1] : min
    const high = thumb < current.length - 1 ? current[thumb + 1] : max
    const clamped = Math.min(Math.max(next, low), high)
    if (clamped === current[thumb]) return
    const updated = current.map((item, i) => (i === thumb ? clamped : item))
    latest.current = updated
    onChange(updated)
  }

  function pickThumb(next: number) {
    if (!isRange) return 0
    const [low, high] = latest.current
    if (next <= low) return 0
    if (next >= high) return 1
    return next - low < high - next ? 0 : 1
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    latest.current = value
    const next = valueAt(e.clientX)
    const thumb = pickThumb(next)
    setActive(thumb)
    e.currentTarget.setPointerCapture(e.pointerId)
    document.getElementById(`${id}-${thumb}`)?.focus()
    move(thumb, next)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (active === null) return
    const next = valueAt(e.clientX)
    let thumb = active
    // When both handles are on the same value, follow the direction of the drag.
    if (isRange && latest.current[0] === latest.current[1]) {
      if (thumb === 0 && next > latest.current[1]) thumb = 1
      if (thumb === 1 && next < latest.current[0]) thumb = 0
      if (thumb !== active) setActive(thumb)
    }
    move(thumb, next)
  }

  function handlePointerUp() {
    if (active === null) return
    setActive(null)
    onCommit?.(latest.current)
  }

  function handleKeyDown(thumb: number, e: KeyboardEvent<HTMLDivElement>) {
    latest.current = value
    const current = value[thumb]
    const steps: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      PageUp: current + bigStep,
      PageDown: current - bigStep,
      Home: min,
      End: max,
    }
    if (!(e.key in steps)) return
    e.preventDefault()
    move(thumb, steps[e.key])
    onCommit?.(latest.current)
  }

  const fillStart = isRange ? percent(value[0]) : 0
  const fillEnd = percent(value[value.length - 1])

  return (
    <div
      ref={trackRef}
      className="relative flex h-8 cursor-pointer touch-none items-center select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="h-1.5 w-full rounded-full bg-secondary" />
      <div
        className="absolute h-1.5 rounded-full bg-primary"
        style={{ left: `${fillStart}%`, right: `${100 - fillEnd}%` }}
      />

      {value.map((thumbValue, thumb) => (
        <div
          key={thumb}
          id={`${id}-${thumb}`}
          role="slider"
          tabIndex={0}
          aria-label={thumbLabels[thumb]}
          aria-valuemin={thumb > 0 ? value[thumb - 1] : min}
          aria-valuemax={thumb < value.length - 1 ? value[thumb + 1] : max}
          aria-valuenow={thumbValue}
          aria-valuetext={formatValue(thumbValue)}
          onKeyDown={(e) => handleKeyDown(thumb, e)}
          className={cn(
            "absolute size-5 -translate-x-1/2 rounded-full border-2 border-primary bg-white shadow-sm outline-none transition-[scale,box-shadow] duration-150 hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/40",
            active === thumb ? "z-10 scale-140 shadow-md hover:scale-140" : "z-0"
          )}
          style={{ left: `${percent(thumbValue)}%` }}
        />
      ))}
    </div>
  )
}
