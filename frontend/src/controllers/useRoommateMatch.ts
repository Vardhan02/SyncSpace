import { useEffect } from "react"
import { toast } from "sonner"

import { clamp, SWIPE_THRESHOLD, useSwipe } from "@/controllers/useSwipe"
import { getRoommates } from "@/services/roommateService"
import { useRoommateStore } from "@/stores/roommateStore"

// CONTROLLER for the roommate match page. It sits between the model
// (roommateService + roommateStore) and the view (RoomateMatchPage):
//   - reads data from the model and works out which cards to show
//   - reacts to what the user does (swipe, buttons, arrow keys)
//   - tells the model to save likes/dislikes
// The page just calls this hook and draws whatever it returns.

export function useRoommateMatch() {
  const saveSwipe = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  // Everyone the user hasn't swiped on yet, best match first.
  const remaining = getRoommates().filter(
    (r) => !likedIds.includes(r.id) && !dislikedIds.includes(r.id)
  )
  const [topCard, nextCard] = remaining

  // Runs once the top card has finished flying off the screen.
  const swipe = useSwipe((dir) => {
    if (!topCard) return
    saveSwipe(topCard.id, dir === "right" ? "like" : "dislike")
    if (dir === "right") toast.success(`You liked ${topCard.name}!`)
  })

  const { dismiss } = swipe

  // Arrow keys on a laptop work the same as the Like / Dislike buttons.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") dismiss("left")
      if (e.key === "ArrowRight") dismiss("right")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dismiss])

  return {
    topCard,
    nextCard,
    remainingCount: remaining.length,
    swipe,
    // 0 → 1 as the top card is dragged towards the swipe line. The view uses
    // it to grow the card underneath into place.
    progress: clamp(Math.abs(swipe.offset.x) / SWIPE_THRESHOLD),
    like: () => dismiss("right"),
    dislike: () => dismiss("left"),
    startOver: reset,
  }
}
