import { useEffect } from "react"
import { toast } from "sonner"

import { clamp, SWIPE_THRESHOLD, useSwipe } from "@/controllers/useSwipe"
import { getRoommates, getSharedTraits } from "@/services/roommateService"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useRoommateStore } from "@/stores/roommateStore"
import type { Roommate } from "@/types"

// CONTROLLER for the roommate match page. It sits between the model
// (roommateService + roommateStore) and the view (RoomateMatchPage):
//   - reads data from the model and works out which cards to show
//   - reacts to what the user does (swipe, buttons, arrow keys)
//   - tells the model to save likes/dislikes
//   - asks the model what the user has in common with each roommate
// The page just calls this hook and draws whatever it returns.

export function useRoommateMatch() {
  const saveSwipe = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  // The signed-in tenant's own onboarding answers, used to work out
  // what they have in common with each roommate.
  const userId = useAuthStore((s) => s.user?.id)
  const myAnswers = usePreferencesStore((s) => (userId ? s.records[userId]?.tenant : undefined))

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
    // Labels for what the signed-in tenant shares with a roommate, e.g. ["Budget fits", "Early bird"].
    sharedWith: (roommate: Roommate) => getSharedTraits(myAnswers ?? {}, roommate),
    like: () => dismiss("right"),
    dislike: () => dismiss("left"),
    startOver: reset,
  }
}
