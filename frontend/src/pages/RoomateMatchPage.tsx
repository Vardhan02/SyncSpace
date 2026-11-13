import {
  BookOpen,
  BriefcaseBusiness,
  Cat,
  CircleDollarSign,
  Heart,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import roommates from "@/mocks/roommates.json"
import { useRoommateStore } from "@/stores/roommateStore"
import type { Roommate } from "@/types"

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SWIPE_THRESHOLD = 100 // px needed to trigger dismiss
const VELOCITY_THRESHOLD = 0.6 // px/ms — fast flick auto-dismisses
const DISMISS_DISTANCE = 1.5 // multiplier — card flies off-screen
const SPRING_DURATION = 300 // ms — snap-back animation
const FLY_DURATION = 350 // ms — fly-out animation
const MAX_ROTATION = 12 // degrees at full drag

const rankedRoommates = (roommates as Roommate[]).toSorted(
  (a, b) => b.matchScore - a.matchScore,
)

/* ------------------------------------------------------------------ */
/*  Swipe hook                                                        */
/* ------------------------------------------------------------------ */

type SwipeResult = {
  offsetX: number
  isDragging: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  dismiss: (direction: "left" | "right") => void
}

function useSwipe(onDismiss: (dir: "left" | "right") => void): SwipeResult {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const dragging = useRef(false)
  const startX = useRef(0)
  const startTime = useRef(0)
  const currentOffset = useRef(0)
  const animatingOut = useRef(false)

  const flyOut = useCallback(
    (direction: "left" | "right") => {
      if (animatingOut.current) return
      animatingOut.current = true
      const target =
        direction === "right"
          ? window.innerWidth * DISMISS_DISTANCE
          : -window.innerWidth * DISMISS_DISTANCE
      setOffsetX(target)
      setTimeout(() => {
        onDismiss(direction)
        setOffsetX(0)
        animatingOut.current = false
      }, FLY_DURATION)
    },
    [onDismiss],
  )

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (animatingOut.current) return
    // Only handle primary button / single touch
    if (e.button !== 0) return
    dragging.current = true
    startX.current = e.clientX
    startTime.current = Date.now()
    currentOffset.current = 0
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    currentOffset.current = dx
    setOffsetX(dx)
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)

      const dx = currentOffset.current
      const dt = Date.now() - startTime.current
      const velocity = Math.abs(dx) / Math.max(dt, 1)

      const shouldDismiss =
        Math.abs(dx) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD
      const direction = dx > 0 ? "right" : "left"

      if (shouldDismiss && Math.abs(dx) > 20) {
        flyOut(direction)
      } else {
        // Snap back
        setOffsetX(0)
      }
    },
    [flyOut],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      onPointerUp(e)
    },
    [onPointerUp],
  )

  const dismiss = useCallback(
    (direction: "left" | "right") => {
      flyOut(direction)
    },
    [flyOut],
  )

  return {
    offsetX,
    isDragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    dismiss,
  }
}

/* ------------------------------------------------------------------ */
/*  Roommate card component                                           */
/* ------------------------------------------------------------------ */

function RoommateCard({
  roommate,
  style,
  isTop,
  swipeHandlers,
  isDragging,
  offsetX,
}: {
  roommate: Roommate
  style?: React.CSSProperties
  isTop: boolean
  swipeHandlers?: SwipeResult["handlers"]
  isDragging?: boolean
  offsetX?: number
}) {
  const moveIn = new Date(roommate.moveIn).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const rotation = isTop ? ((offsetX ?? 0) / window.innerWidth) * MAX_ROTATION : 0
  const likeOpacity = isTop ? Math.max(0, Math.min((offsetX ?? 0) / SWIPE_THRESHOLD, 1)) : 0
  const nopeOpacity = isTop
    ? Math.max(0, Math.min(-(offsetX ?? 0) / SWIPE_THRESHOLD, 1))
    : 0

  const initials = roommate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_8px_30px_rgba(44,44,42,0.10)]",
        isTop ? "z-10" : "z-0",
        !isDragging && "transition-transform duration-300 ease-out",
      )}
      style={{
        transform: isTop
          ? `translateX(${offsetX ?? 0}px) rotate(${rotation}deg)`
          : "scale(0.96) translateY(8px)",
        willChange: isTop ? "transform" : undefined,
        touchAction: "pan-y",
        ...style,
      }}
      {...(isTop ? swipeHandlers : {})}
    >
      {/* Swipe feedback overlays */}
      {isTop ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-30 rounded-[20px] border-[3px] border-green-500 bg-green-500/5"
            style={{ opacity: likeOpacity }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-30 rounded-[20px] border-[3px] border-red-400 bg-red-400/5"
            style={{ opacity: nopeOpacity }}
          />
          {/* Stamp labels */}
          <span
            className="pointer-events-none absolute top-6 left-6 z-40 rotate-[-12deg] rounded-[10px] border-[3px] border-green-500 px-4 py-1.5 text-[22px] font-extrabold tracking-wide text-green-500 uppercase"
            style={{ opacity: likeOpacity }}
          >
            Like
          </span>
          <span
            className="pointer-events-none absolute top-6 right-6 z-40 rotate-[12deg] rounded-[10px] border-[3px] border-red-400 px-4 py-1.5 text-[22px] font-extrabold tracking-wide text-red-400 uppercase"
            style={{ opacity: nopeOpacity }}
          >
            Nope
          </span>
        </>
      ) : null}

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-6">
        {/* Header: avatar + name + match score */}
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-[20px] font-semibold text-foreground sm:size-20 sm:text-[24px]">
            {roommate.photo ? (
              <img
                src={roommate.photo}
                alt={roommate.name}
                className="size-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[20px] font-semibold tracking-[-0.3px] text-foreground sm:text-[22px]">
              {roommate.name}
              <span className="ml-1.5 text-muted-foreground">, {roommate.age}</span>
            </h2>
            <p className="flex items-center gap-1.5 pt-0.5 text-[13px] text-muted-foreground sm:text-[14px]">
              <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
              {roommate.course}
            </p>
            <p className="text-[12px] text-muted-foreground sm:text-[13px]">
              {roommate.university}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground sm:size-12 sm:text-[15px]">
              {roommate.matchScore}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">match</span>
          </div>
        </div>

        {/* Bio */}
        <p className="mt-5 text-[14px] leading-relaxed text-foreground sm:text-[15px]">
          "{roommate.bio}"
        </p>

        {/* Details grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          <Detail
            icon={<CircleDollarSign className="size-4" />}
            label="Budget"
            value={`€${roommate.budget}/mo`}
          />
          <Detail
            icon={<BriefcaseBusiness className="size-4" />}
            label="Move in"
            value={moveIn}
          />
          <Detail
            icon={
              roommate.sleepSchedule === "Early bird" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )
            }
            label="Sleep"
            value={roommate.sleepSchedule}
          />
          <Detail
            icon={<Sparkles className="size-4" />}
            label="Cleanliness"
            value={roommate.cleanliness}
          />
        </div>

        {/* Tags */}
        <div className="mt-5 flex flex-wrap gap-2">
          {roommate.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground sm:text-[13px]"
            >
              {interest}
            </span>
          ))}
          {roommate.pets ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground sm:text-[13px]">
              <Cat className="size-3" aria-hidden="true" /> Has pets
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-white px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-[13px] font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function RoomateMatchPage() {
  const swipeAction = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  const seenIds = useMemo(
    () => new Set([...likedIds, ...dislikedIds]),
    [likedIds, dislikedIds],
  )

  const remaining = useMemo(
    () => rankedRoommates.filter((r) => !seenIds.has(r.id)),
    [seenIds],
  )

  const topCard = remaining[0] ?? null
  const nextCard = remaining[1] ?? null

  const handleDismiss = useCallback(
    (direction: "left" | "right") => {
      if (!topCard) return
      const action = direction === "right" ? "like" : "dislike"
      swipeAction(topCard.id, action)
      if (action === "like") {
        toast.success(`You liked ${topCard.name}!`)
      }
    },
    [topCard, swipeAction],
  )

  const { offsetX, isDragging, handlers, dismiss } = useSwipe(handleDismiss)

  /* Keyboard support */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") dismiss("left")
      if (e.key === "ArrowRight") dismiss("right")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dismiss])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="w-full max-w-md text-center md:text-left">
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          Find a roommate
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">
          {remaining.length > 0
            ? `${remaining.length} people left · swipe or tap`
            : "You've seen everyone!"}
        </p>
      </div>

      {/* Card stack */}
      {remaining.length > 0 ? (
        <>
          <div className="relative mx-auto h-[min(520px,72dvh)] w-full max-w-md select-none sm:h-[540px]">
            {/* Next card (behind) */}
            {nextCard ? (
              <RoommateCard roommate={nextCard} isTop={false} />
            ) : null}

            {/* Current card */}
            {topCard ? (
              <RoommateCard
                roommate={topCard}
                isTop
                swipeHandlers={handlers}
                isDragging={isDragging}
                offsetX={offsetX}
              />
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="Dislike"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
              onClick={() => dismiss("left")}
            >
              <X className="size-7 text-red-400 transition-transform group-hover:scale-110" />
            </button>
            <button
              type="button"
              aria-label="Like"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-all hover:border-green-400 hover:bg-green-50 active:scale-95"
              onClick={() => dismiss("right")}
            >
              <Heart className="size-7 text-green-500 transition-transform group-hover:scale-110" />
            </button>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex w-full max-w-md flex-col items-center rounded-[20px] border border-dashed border-border px-6 py-20 text-center">
          <User className="size-10 text-muted-foreground" />
          <p className="mt-4 text-[16px] font-semibold text-foreground">
            No more roommates
          </p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            You've swiped through everyone. Check your matches or start over.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-primary bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/80 active:scale-[0.98]"
            onClick={reset}
          >
            <RefreshCw className="size-4" />
            Start over
          </button>
        </div>
      )}
    </div>
  )
}

