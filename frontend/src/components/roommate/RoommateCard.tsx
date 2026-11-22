import { BookOpen, ChevronDown, Info } from "lucide-react"
import { useState } from "react"
import type { CSSProperties } from "react"

import { RoommateDetails } from "@/components/roommate/RoommateDetails"
import { clamp } from "@/controllers/useSwipe"
import type { SwipeController } from "@/controllers/useSwipe"
import { cn } from "@/lib/utils"
import type { Roommate } from "@/types"

// VIEW: draws one roommate card. It gets the roommate (model data) and the
// swipe controller as props, and only decides how things look. The one bit
// of state here, `expanded`, is purely visual (is the phone info panel open?).

const STAMPS = [
  {
    label: "Like",
    dir: 1,
    classes: "border-emerald-500 text-emerald-500 left-6 -rotate-[18deg]",
    wash: "border-emerald-500 bg-emerald-500/10",
  },
  {
    label: "Nope",
    dir: -1,
    classes: "border-rose-500 text-rose-500 right-6 rotate-[18deg]",
    wash: "border-rose-500 bg-rose-500/10",
  },
]

export function RoommateCard({
  roommate,
  style,
  swipe,
}: {
  roommate: Roommate
  style: CSSProperties
  // Only the top card gets a swipe controller; the card underneath doesn't.
  swipe?: SwipeController
}) {
  const [expanded, setExpanded] = useState(false)
  const isTop = !!swipe

  const initials = roommate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_12px_40px_rgba(44,44,42,0.14)] will-change-transform",
        isTop ? "z-10 cursor-grab active:cursor-grabbing" : "pointer-events-none z-0"
      )}
      style={{ ...style, touchAction: isTop ? "none" : undefined }}
      {...swipe?.handlers}
    >
      {swipe &&
        STAMPS.map(({ label, dir, classes, wash }) => (
          <div
            key={label}
            className={cn(
              "pointer-events-none absolute inset-0 z-30 rounded-[20px] border-[3px]",
              wash
            )}
            style={{ opacity: clamp((swipe.offset.x * dir) / 90) }}
          >
            <span
              className={cn(
                "absolute top-8 rounded-[10px] border-[3px] px-3 py-1 text-[28px] font-extrabold tracking-wide uppercase",
                classes
              )}
            >
              {label}
            </span>
          </div>
        ))}

      {/* Phones: one column (photo fills the card). Laptops (lg): a row, photo left + details right. */}
      <div className="relative flex h-full flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#efede6] lg:w-1/2 lg:flex-none">
          {roommate.photo ? (
            <img
              src={roommate.photo}
              alt={roommate.name}
              draggable={false}
              className="pointer-events-none h-full w-full object-cover object-center"
            />
          ) : (
            <span className="text-[72px] font-semibold tracking-tight text-[#b4b2a9] sm:text-[88px] md:text-[100px]">
              {initials}
            </span>
          )}
        </div>

        {/* Laptop-only right-hand panel. "hidden lg:flex" = invisible on phones, shown from lg up. */}
        <div className="hidden min-h-0 w-1/2 flex-col overflow-y-auto border-l border-border lg:flex">
          <div className="flex items-start justify-between gap-4 border-b border-border px-8 pt-7 pb-5">
            <div className="min-w-0">
              <h2 className="text-[28px] font-bold text-foreground">
                {roommate.name}
                <span className="ml-1.5 font-normal text-muted-foreground">{roommate.age}</span>
              </h2>
              <p className="flex items-center gap-1.5 pt-1 text-[14px] text-muted-foreground">
                <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                {roommate.course}
              </p>
              <p className="pt-0.5 text-[13px] text-muted-foreground">
                {roommate.university} · Looking for a room
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-600">
              {roommate.matchScore}% match
            </span>
          </div>

          <RoommateDetails roommate={roommate} />
        </div>

        {/* Phone-only name bar over the photo (hidden on laptops, where the right panel shows this). */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t lg:hidden from-black/70 via-black/40 to-transparent px-5 pt-16 pb-5 sm:px-6 sm:pb-6 md:px-8 md:pb-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[24px] font-bold text-white sm:text-[26px] md:text-[28px]">
                {roommate.name}
                <span className="ml-1 font-normal opacity-80">{roommate.age}</span>
              </h2>

              <p className="flex items-center gap-1.5 pt-0.5 text-[13px] text-white/80 sm:text-[14px]">
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                {roommate.course}
              </p>

              <p className="pt-0.5 text-[12px] text-white/60 sm:text-[13px]">
                {roommate.university} · Looking for a room
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-bold text-white backdrop-blur-sm">
                {roommate.matchScore}%
              </span>

              <button
                type="button"
                aria-label="More info"
                className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                onClick={() => setExpanded(true)}
              >
                <Info className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col overflow-y-auto rounded-[20px] bg-white transition-all duration-300 ease-out lg:hidden",
            expanded
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-full opacity-0"
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-white px-5 py-4 sm:px-6 md:px-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-[16px] font-semibold text-foreground">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-foreground">
                {roommate.name}, {roommate.age}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {roommate.course} · {roommate.university}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close details"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setExpanded(false)}
            >
              <ChevronDown className="size-5" />
            </button>
          </div>

          <RoommateDetails roommate={roommate} />
        </div>
      </div>
    </div>
  )
}
