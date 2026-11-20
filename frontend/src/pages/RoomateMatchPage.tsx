import {
  BookOpen,
  CalendarDays,
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
import { useEffect, useRef, useState } from "react"
import type { PointerEvent, ReactNode } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import roommates from "@/mocks/roommates.json"
import { useRoommateStore } from "@/stores/roommateStore"
import type { Roommate } from "@/types"

// How far (in px) the card must be dragged before letting go counts as a swipe.
const SWIPE_THRESHOLD = 110
// A quick "flick" counts as a swipe even if it's short. Speed is px per millisecond.
const FLICK_SPEED = 0.5
const FLICK_MIN_DISTANCE = 30

const rankedRoommates = (roommates as Roommate[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

type Direction = "left" | "right"

// What the card is currently animating: nothing, springing back to the
// middle, or flying off the screen.
type Animation = "none" | "return" | "leave"

const TRANSITIONS: Record<Animation, string> = {
  none: "none",
  // This curve slightly overshoots before settling, so the card "bounces" back.
  return: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  leave: "transform 350ms ease-out",
}

/**
 * Drag state lives in React state; CSS transitions handle the spring-back
 * and fly-out animations.
 */
function useSwipe(onDismiss: (dir: Direction) => void) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [animation, setAnimation] = useState<Animation>("none")
  // +1 if the card was grabbed on its top half, -1 for the bottom half.
  // A card held from the bottom tilts the opposite way, like a real card.
  const [tilt, setTilt] = useState(1)
  const grab = useRef<{ x: number; y: number } | null>(null)
  const leaving = useRef<Direction | null>(null)
  // The last pointer position and time, used to measure swipe speed.
  const lastSample = useRef({ x: 0, y: 0, t: 0 })
  const velocity = useRef({ x: 0, y: 0 })

  function dismiss(dir: Direction, fromY = -40) {
    if (leaving.current) return
    leaving.current = dir
    setAnimation("leave")
    // Fly far enough to be fully off-screen, and keep the vertical direction
    // the user was dragging in so the motion feels continuous.
    setOffset({ x: (dir === "right" ? 1 : -1) * window.innerWidth * 1.5, y: fromY })
  }

  function onPointerDown(e: PointerEvent) {
    if (leaving.current || (e.target as HTMLElement).closest("button")) return
    grab.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    lastSample.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    velocity.current = { x: 0, y: 0 }

    const rect = e.currentTarget.getBoundingClientRect()
    setTilt(e.clientY < rect.top + rect.height / 2 ? 1 : -1)
    setAnimation("none")
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!grab.current) return

    // Speed = distance moved / time taken since the last move event.
    const dt = e.timeStamp - lastSample.current.t
    if (dt > 0) {
      velocity.current = {
        x: (e.clientX - lastSample.current.x) / dt,
        y: (e.clientY - lastSample.current.y) / dt,
      }
    }
    lastSample.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }

    const next = { x: e.clientX - grab.current.x, y: e.clientY - grab.current.y }

    // Tiny vibration (phones that support it) the moment the drag crosses the
    // like/nope line, so the user can feel that letting go will count.
    const wasPast = Math.abs(offset.x) > SWIPE_THRESHOLD
    const isPast = Math.abs(next.x) > SWIPE_THRESHOLD
    if (wasPast !== isPast) navigator.vibrate?.(10)

    setOffset(next)
  }

  function onPointerUp() {
    if (!grab.current) return
    grab.current = null

    const vx = velocity.current.x
    const draggedFarEnough = Math.abs(offset.x) > SWIPE_THRESHOLD
    // A flick: fast, moved a little, and the flick goes the same way as the drag.
    const flicked =
      Math.abs(vx) > FLICK_SPEED &&
      Math.abs(offset.x) > FLICK_MIN_DISTANCE &&
      Math.sign(vx) === Math.sign(offset.x)

    if (draggedFarEnough || flicked) {
      dismiss(offset.x > 0 ? "right" : "left", offset.y + velocity.current.y * 300)
    } else {
      setAnimation("return")
      setOffset({ x: 0, y: 0 })
    }
  }

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return
    if (!leaving.current) {
      setAnimation("none")
      return
    }
    const dir = leaving.current
    leaving.current = null
    setAnimation("none")
    setOffset({ x: 0, y: 0 })
    setTilt(1)
    onDismiss(dir)
  }

  // The tilt angle grows with how far the card moved compared to the screen
  // width, so it looks right on both a narrow phone and a wide laptop.
  const rotation =
    clamp((offset.x / window.innerWidth) * 30, -15, 15) * tilt

  return {
    offset,
    rotation,
    transition: TRANSITIONS[animation],
    animating: animation !== "none",
    dismiss,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onTransitionEnd,
    },
  }
}

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))

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

function RoommateCard({
  roommate,
  style,
  swipe,
}: {
  roommate: Roommate
  style: React.CSSProperties
  swipe?: ReturnType<typeof useSwipe>
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

/** About / Details / Interests sections. Used in both the phone and laptop layouts. */
function RoommateDetails({ roommate }: { roommate: Roommate }) {
  const moveIn = new Date(roommate.moveIn).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
      <Section title="About">
        <p className="text-[14px] leading-relaxed text-foreground sm:text-[15px]">
          {roommate.bio}
        </p>
      </Section>

      <Section title="Details">
        <div className="grid grid-cols-2 gap-3">
          <Detail
            icon={<CircleDollarSign className="size-4" />}
            label="Budget"
            value={`€${roommate.budget}/mo`}
          />
          <Detail icon={<CalendarDays className="size-4" />} label="Move in" value={moveIn} />
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
      </Section>

      <Section title="Interests">
        <div className="flex flex-wrap gap-2">
          {roommate.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground sm:text-[13px]"
            >
              {interest}
            </span>
          ))}

          {roommate.pets && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground">
              <Cat className="size-3" aria-hidden="true" />
              Has pets
            </span>
          )}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode
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

export function RoomateMatchPage() {
  const swipeAction = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  const remaining = rankedRoommates.filter(
    (r) => !likedIds.includes(r.id) && !dislikedIds.includes(r.id)
  )
  const [topCard, nextCard] = remaining

  const swipe = useSwipe((dir) => {
    if (!topCard) return
    swipeAction(topCard.id, dir === "right" ? "like" : "dislike")
    if (dir === "right") toast.success(`You liked ${topCard.name}!`)
  })

  const { offset, rotation, transition, dismiss } = swipe

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") dismiss("left")
      if (e.key === "ArrowRight") dismiss("right")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dismiss])

  const progress = clamp(Math.abs(offset.x) / SWIPE_THRESHOLD)

  return (
    // Fit the page exactly in the screen so nothing scrolls. 100dvh is the
    // visible screen height; we subtract the top bar (~62px) and the space
    // TenantLayout keeps around the page (24px + 128px for the bottom menu on
    // phones, 40px + 40px from md up).
    <div className="flex h-[calc(100dvh-213px)] min-h-0 w-full flex-col items-center gap-2 overflow-hidden py-2 md:h-[calc(100dvh-142px)]">
      <div className="w-full shrink-0 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground sm:text-[26px] md:text-[30px]">
          Find a roommate
        </h1>
        <p className="pt-1 text-[12px] text-muted-foreground sm:text-[14px]">
          {remaining.length > 0
            ? `${remaining.length} people left · swipe right to like`
            : "You've seen everyone!"}
        </p>
      </div>

      {topCard ? (
        <>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            {/* Phones: the card takes the height that's left (h-full), and its width follows
                from its shape (aspect). max-w-full stops it getting wider than the screen.
                Laptops (lg): fixed width, and only the height shrinks on short screens. */}
            <div className="relative aspect-[4/5] h-full max-h-[620px] max-w-full touch-none select-none lg:aspect-auto lg:max-h-[575px] lg:w-[min(100%,920px)]">
              {nextCard && (
                <RoommateCard
                  key={nextCard.id}
                  roommate={nextCard}
                  style={{
                    transform: `translateY(${14 * (1 - progress)}px) scale(${0.94 + progress * 0.06})`,
                    transition,
                  }}
                />
              )}

              <RoommateCard
                key={topCard.id}
                roommate={topCard}
                swipe={swipe}
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg)`,
                  transition,
                }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-8 pb-1">
            <button
              type="button"
              aria-label="Dislike"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-90 sm:size-16"
              onClick={() => dismiss("left")}
            >
              <XIcon className="size-7 text-rose-500 transition-transform group-hover:scale-110 sm:size-8" />
            </button>

            <button
              type="button"
              aria-label="Like"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-90 sm:size-16"
              onClick={() => dismiss("right")}
            >
              <Heart className="size-7 fill-emerald-500 text-emerald-500 transition-transform group-hover:scale-110 sm:size-8" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-[20px] border border-dashed border-border px-6 text-center">
          <User className="size-10 text-muted-foreground" />
          <p className="mt-4 text-[16px] font-semibold text-foreground">No more roommates</p>
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
