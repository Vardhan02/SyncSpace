import {
  BookOpen,
  BriefcaseBusiness,
  Cat,
  ChevronDown,
  CircleDollarSign,
  Heart,
  Info,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  User,
  X as XIcon,
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
const FLY_DURATION = 350 // ms — fly-out animation
const MAX_ROTATION = 12 // degrees at full drag

const rankedRoommates = (roommates as Roommate[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

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
    [onDismiss]
  )

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (animatingOut.current) return
    if (e.button !== 0) return
    dragging.current = true
    startX.current = e.clientX
    startTime.current = Date.now()
    currentOffset.current = 0
    setIsDragging(true)
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    currentOffset.current = dx
    setOffsetX(dx)
  }, [])

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
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
        setOffsetX(0)
      }
    },
    [flyOut]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      onPointerUp(e)
    },
    [onPointerUp]
  )

  const dismiss = useCallback(
    (direction: "left" | "right") => {
      flyOut(direction)
    },
    [flyOut]
  )

  return {
    offsetX,
    isDragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    dismiss,
  }
}

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
  const [expanded, setExpanded] = useState(false)

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
        "absolute inset-0 overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_8px_30px_rgba(44,44,42,0.10)]",
        isTop ? "z-10" : "z-0",
        !isDragging && "transition-transform duration-300 ease-out"
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

      <div className="relative flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center bg-[#efede6]">
          {roommate.photo ? (
            <img
              src={roommate.photo}
              alt={roommate.name}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-[72px] font-semibold tracking-tight text-[#b4b2a9] sm:text-[88px] md:text-[100px]">
              {initials}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-5 pt-16 pb-5 sm:px-6 sm:pb-6 md:px-8 md:pb-7">
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
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(true)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Info className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col overflow-y-auto rounded-[20px] bg-black/60 backdrop-blur-xl transition-all duration-300 ease-out",
            expanded
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-full opacity-0"
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/15 bg-black/40 px-5 py-4 backdrop-blur-sm sm:px-6 md:px-8">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-[16px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-white">
                {roommate.name}, {roommate.age}
              </h3>
              <p className="text-[13px] text-white/60">
                {roommate.course} · {roommate.university}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close details"
              className="flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white"
              onClick={() => setExpanded(false)}
            >
              <ChevronDown className="size-5" />
            </button>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                About
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white sm:text-[15px]">
                {roommate.bio}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                Details
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
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
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-wide text-white/50 uppercase">
                Interests
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roommate.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white sm:text-[13px]"
                  >
                    {interest}
                  </span>
                ))}
                {roommate.pets ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white sm:text-[13px]">
                    <Cat className="size-3" aria-hidden="true" /> Has pets
                  </span>
                ) : null}
              </div>
            </div>
          </div>
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
    <div className="flex items-center gap-2.5 rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5">
      <span className="text-white/50">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-white/50">{label}</p>
        <p className="truncate text-[13px] font-medium text-white">{value}</p>
      </div>
    </div>
  )
}

export function RoomateMatchPage() {
  const swipeAction = useRoommateStore((state) => state.swipe)
  const likedIds = useRoommateStore((state) => state.likedIds)
  const dislikedIds = useRoommateStore((state) => state.dislikedIds)
  const reset = useRoommateStore((state) => state.reset)

  const seenIds = useMemo(
    () => new Set([...likedIds, ...dislikedIds]),
    [likedIds, dislikedIds]
  )

  const remaining = useMemo(
    () => rankedRoommates.filter((r) => !seenIds.has(r.id)),
    [seenIds]
  )

  const topCard = remaining[0] ?? null
  const nextCard = remaining[1] ?? null

  function handleDismiss(direction: "left" | "right") {
    if (!topCard) return
    const action = direction === "right" ? "like" : "dislike"
    swipeAction(topCard.id, action)
    if (action === "like") {
      toast.success(`You liked ${topCard.name}!`)
    }
  }

  const { offsetX, isDragging, handlers, dismiss } = useSwipe(handleDismiss)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") dismiss("left")
      if (e.key === "ArrowRight") dismiss("right")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dismiss])

  return (
    <div className="flex h-[calc(100dvh-220px)] max-h-[720px] flex-col items-center gap-4 md:h-[calc(100dvh-165px)] md:max-h-[780px]">
      <div className="w-full max-w-md shrink-0 text-center md:max-w-xl md:text-left">
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          Find a roommate
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">
          {remaining.length > 0
            ? `${remaining.length} people left · swipe or tap`
            : "You've seen everyone!"}
        </p>
      </div>

      {remaining.length > 0 ? (
        <>
          <div className="relative mx-auto w-full min-w-0 flex-1 max-w-md select-none md:max-w-xl">
            {nextCard ? (
              <RoommateCard roommate={nextCard} isTop={false} />
            ) : null}

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

          <div className="flex shrink-0 items-center gap-6 pb-1">
            <button
              type="button"
              aria-label="Dislike"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
              onClick={() => dismiss("left")}
            >
              <XIcon className="size-7 text-red-400 transition-transform group-hover:scale-110" />
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
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center rounded-[20px] border border-dashed border-border px-6 text-center md:max-w-xl">
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
