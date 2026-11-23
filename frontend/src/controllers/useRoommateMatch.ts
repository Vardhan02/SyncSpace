import { useEffect } from "react"
import { toast } from "sonner"

import { clamp, SWIPE_THRESHOLD, useSwipe } from "@/controllers/useSwipe"
import { getRoommates, getSharedTraits } from "@/services/roommateService"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useRoommateStore } from "@/stores/roommateStore"
import type { Roommate } from "@/types"

export function useRoommateMatch() {
  const saveSwipe = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  const userId = useAuthStore((s) => s.user?.id)
  const myAnswers = usePreferencesStore((s) => (userId ? s.records[userId]?.tenant : undefined))

  const remaining = getRoommates().filter(
    (r) => !likedIds.includes(r.id) && !dislikedIds.includes(r.id)
  )
  const [topCard, nextCard] = remaining

  const swipe = useSwipe((dir) => {
    if (!topCard) return
    saveSwipe(topCard.id, dir === "right" ? "like" : "dislike")
    if (dir === "right") toast.success(`You liked ${topCard.name}!`)
  })

  const { dismiss } = swipe

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
    progress: clamp(Math.abs(swipe.offset.x) / SWIPE_THRESHOLD),
    sharedWith: (roommate: Roommate) => getSharedTraits(myAnswers ?? {}, roommate),
    like: () => dismiss("right"),
    dislike: () => dismiss("left"),
    startOver: reset,
  }
}
