import { useRef, useState } from "react"
import type { PointerEvent, TransitionEvent } from "react"

export const SWIPE_THRESHOLD = 110
const FLICK_SPEED = 0.5
const FLICK_MIN_DISTANCE = 30

export type Direction = "left" | "right"

type Animation = "none" | "return" | "leave"

const TRANSITIONS: Record<Animation, string> = {
  none: "none",
  return: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  leave: "transform 350ms ease-out",
}

export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))

export function useSwipe(onDismiss: (dir: Direction) => void) {
  const [offset, setOffsetState] = useState({ x: 0, y: 0 })
  const latestOffset = useRef({ x: 0, y: 0 })
  function setOffset(next: { x: number; y: number }) {
    latestOffset.current = next
    setOffsetState(next)
  }
  const [animation, setAnimation] = useState<Animation>("none")
  const [tilt, setTilt] = useState(1)
  const grab = useRef<{ x: number; y: number } | null>(null)
  const leaving = useRef<Direction | null>(null)
  const lastSample = useRef({ x: 0, y: 0, t: 0 })
  const velocity = useRef({ x: 0, y: 0 })

  function dismiss(dir: Direction, fromY = -40) {
    if (leaving.current) return
    leaving.current = dir
    setAnimation("leave")
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

    const dt = e.timeStamp - lastSample.current.t
    if (dt > 0) {
      velocity.current = {
        x: (e.clientX - lastSample.current.x) / dt,
        y: (e.clientY - lastSample.current.y) / dt,
      }
    }
    lastSample.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }

    const next = { x: e.clientX - grab.current.x, y: e.clientY - grab.current.y }

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
