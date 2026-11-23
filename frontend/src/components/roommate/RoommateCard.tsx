import { ChevronDown, GraduationCap, HeartHandshake, Info, MapPin, Wallet } from "lucide-react"
import { useState } from "react"
import type { CSSProperties, ReactNode } from "react"

import { RoommateDetails } from "@/components/roommate/RoommateDetails"
import { clamp } from "@/controllers/useSwipe"
import type { SwipeController } from "@/controllers/useSwipe"
import { formatBudgetRange, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Roommate } from "@/types"

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

const PHOTO_CHIPS = 2

export function RoommateCard({
  roommate,
  shared,
  style,
  swipe,
}: {
  roommate: Roommate
  shared: string[]
  style: CSSProperties
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

        <div className="hidden min-h-0 w-1/2 flex-col overflow-y-auto border-l border-border lg:flex">
          <div className="flex items-start justify-between gap-4 border-b border-border px-8 pt-7 pb-5">
            <div className="min-w-0">
              <h2 className="text-[28px] font-bold text-foreground">
                {roommate.name}
                <span className="ml-1.5 font-normal text-muted-foreground">{roommate.age}</span>
              </h2>
              <p className="flex items-center gap-1.5 pt-1 text-[14px] text-muted-foreground">
                <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                {roommate.course} · {roommate.university}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-600">
              {roommate.matchScore}% match
            </span>
          </div>

          <RoommateDetails roommate={roommate} shared={shared} />
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t lg:hidden from-black/80 via-black/50 to-transparent px-5 pt-20 pb-5 sm:px-6 sm:pb-6 md:px-8 md:pb-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-[26px] leading-tight font-bold text-white sm:text-[28px] md:text-[30px]">
              {roommate.name}
              <span className="ml-1.5 font-normal opacity-90">{roommate.age}</span>
            </h2>

            <button
              type="button"
              aria-label="More info"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              onClick={() => setExpanded(true)}
            >
              <Info className="size-5" />
            </button>
          </div>

          <PhotoLine icon={<GraduationCap className="size-4" />}>
            {roommate.course} · {roommate.university}
          </PhotoLine>
          <PhotoLine icon={<MapPin className="size-4" />}>{roommate.areas.join(" · ")}</PhotoLine>
          <PhotoLine icon={<Wallet className="size-4" />}>
            {formatBudgetRange(roommate.budgetMin, roommate.budgetMax)}/mo · from{" "}
            {formatDate(roommate.moveIn)}
          </PhotoLine>

          <div className="flex flex-wrap gap-1.5 pt-2.5">
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[12px] font-bold text-white">
              {roommate.matchScore}% match
            </span>
            {shared.slice(0, PHOTO_CHIPS).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm"
              >
                <HeartHandshake className="size-3" aria-hidden="true" />
                {item}
              </span>
            ))}
            {shared.length > PHOTO_CHIPS && (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
                +{shared.length - PHOTO_CHIPS} in common
              </span>
            )}
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

          <RoommateDetails roommate={roommate} shared={shared} />
        </div>
      </div>
    </div>
  )
}

function PhotoLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 pt-1 text-[13px] text-white/90 sm:text-[14px]">
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </p>
  )
}
