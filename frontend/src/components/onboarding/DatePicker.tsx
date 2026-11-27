import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

type DatePickerProps = {
  id?: string
  value?: string
  min?: string
  placeholder?: string
  onChange: (value: string) => void
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

// Dates are stored as "YYYY-MM-DD" in local time, same as a native date input.
function toKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // Monday first
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function DatePicker({ id, value, min, placeholder = "Pick a date", onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(() => (value ? fromKey(value) : min ? fromKey(min) : new Date()))
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const [todayKey] = useState(() => toKey(new Date()))
  const focusedKey = toKey(focused)
  const isDisabled = (key: string) => Boolean(min && key < min)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Keep keyboard focus on the highlighted day while the calendar is open.
  useEffect(() => {
    if (!open) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedKey}"]`)?.focus()
  }, [open, focusedKey])

  function toggle() {
    if (!open) setFocused(value ? fromKey(value) : min ? fromKey(min) : new Date())
    setOpen(!open)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function select(day: Date) {
    const key = toKey(day)
    if (isDisabled(key)) return
    onChange(key)
    close()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -((focused.getDay() + 6) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() + 6) % 7)),
    }

    if (e.key === "Escape") {
      e.preventDefault()
      close()
    } else if (e.key in moves) {
      e.preventDefault()
      const next = moves[e.key]()
      if (!isDisabled(toKey(next))) setFocused(next)
    }
  }

  const canGoBack = !min || toKey(new Date(focused.getFullYear(), focused.getMonth(), 0)) >= min
  const monthLabel = focused.toLocaleDateString("en-IE", { month: "long", year: "numeric" })

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[12px] border border-input bg-transparent px-3.5 text-left text-[15px] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          open && "border-ring",
          value ? "text-foreground" : "text-placeholder"
        )}
      >
        {value
          ? fromKey(value).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })
          : placeholder}
        <CalendarDays className="size-4.5 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute top-full left-0 z-30 mt-2 w-full max-w-80 rounded-2xl border border-border bg-white p-3 shadow-[0_12px_40px_rgba(44,44,42,0.12)]"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoBack}
              onClick={() => setFocused(addMonths(focused, -1))}
              className="flex size-9 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p aria-live="polite" className="text-[14px] font-semibold text-foreground">
              {monthLabel}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setFocused(addMonths(focused, 1))}
              className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 pb-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-center text-[12px] font-medium text-muted-foreground">
                {day}
              </span>
            ))}
          </div>

          <div ref={gridRef} role="grid" className="grid grid-cols-7 gap-y-0.5">
            {monthDays(focused).map((day) => {
              const key = toKey(day)
              const outside = day.getMonth() !== focused.getMonth()
              const selected = key === value
              const disabled = isDisabled(key)

              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  tabIndex={key === focusedKey ? 0 : -1}
                  disabled={disabled}
                  aria-selected={selected}
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label={day.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => select(day)}
                  className={cn(
                    "mx-auto flex size-9 items-center justify-center rounded-full text-[14px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-foreground hover:bg-secondary",
                    outside && !selected && "text-muted-foreground/60",
                    key === todayKey && !selected && "font-semibold underline underline-offset-4",
                    disabled && "pointer-events-none opacity-30"
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
