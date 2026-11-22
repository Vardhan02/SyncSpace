import { useRef, useState } from "react"
import type { PointerEvent, TransitionEvent } from "react"

// CONTROLLER: turns raw pointer (mouse/finger) events into "swiped left" or
// "swiped right". It doesn't know anything about roommates, so it could be
// reused for any swipeable card.

// How far (in px) the card must be dragged before letting go counts as a swipe.
export const SWIPE_THRESHOLD = 110
// A quick "flick" counts as a swipe even if it's short. Speed is px per millisecond.
const FLICK_SPEED = 0.5
const FLICK_MIN_DISTANCE = 30

export type Direction = "left" | "right"

// What the card is currently animating: nothing, springing back to the
// middle, or flying off the screen.
type Animation = "none" | "return" | "leave"

const TRANSITIONS: Record<Animation, string> = {
  none: "none",
  // This curve slightly overshoots before settling, so the card "bounces" back.
  return: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  leave: "transform 350ms ease-out",
}

export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))

/**
 * Drag state lives in React state; CSS transitions handle the spring-back
 * and fly-out animations.
 */
export function useSwipe(onDismiss: (dir: Direction) => void) {
  const [offset, setOffsetState] = useState({ x: 0, y: 0 })
  // A copy of the latest offset that updates instantly. React state only
  // updates on the next redraw, so a very fast flick could let go before
  // `offset` caught up. The pointer handlers read this ref instead.
  const latestOffset = useRef({ x: 0, y: 0 })
  function setOffset(next: { x: number; y: number }) {
    latestOffset.current = next
    setOffsetState(next)
  }
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
    const current = latestOffset.current
    grab.current = { x: e.clientX - current.x, y: e.clientY - current.y }
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
    const wasPast = Math.abs(latestOffset.current.x) > SWIPE_THRESHOLD
    const isPast = Math.abs(next.x) > SWIPE_THRESHOLD
    if (wasPast !== isPast) navigator.vibrate?.(10)

    setOffset(next)
  }

  function onPointerUp() {
    if (!grab.current) return
    grab.current = null

    const { x, y } = latestOffset.current
    const vx = velocity.current.x
    const draggedFarEnough = Math.abs(x) > SWIPE_THRESHOLD
    // A flick: fast, moved a little, and the flick goes the same way as the drag.
    const flicked =
      Math.abs(vx) > FLICK_SPEED &&
      Math.abs(x) > FLICK_MIN_DISTANCE &&
      Math.sign(vx) === Math.sign(x)

    if (draggedFarEnough || flicked) {
      dismiss(x > 0 ? "right" : "left", y + velocity.current.y * 300)
    } else {
      setAnimation("return")
      setOffset({ x: 0, y: 0 })
    }
  }

  function onTransitionEnd(e: TransitionEvent) {
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
  const rotation = clamp((offset.x / window.innerWidth) * 30, -15, 15) * tilt

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

export type SwipeController = ReturnType<typeof useSwipe>
