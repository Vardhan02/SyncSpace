import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"

import { clamp, SWIPE_THRESHOLD, useSwipe } from "@/controllers/useSwipe"
import { cardFromOnboarding } from "@/lib/tenantCard"
import { fetchRoommates, getSharedTraits, sendSwipe } from "@/services/roommateService"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useRoommateStore } from "@/stores/roommateStore"
import type { Roommate } from "@/types"

export function useRoommateMatch() {
  const queryClient = useQueryClient()
  const saveSwipe = useRoommateStore((s) => s.swipe)
  const likedIds = useRoommateStore((s) => s.likedIds)
  const dislikedIds = useRoommateStore((s) => s.dislikedIds)
  const reset = useRoommateStore((s) => s.reset)

  const userId = useAuthStore((s) => s.user?.id)
  const myAnswers = usePreferencesStore((s) => (userId ? s.records[userId]?.tenant : undefined))

  const { data: roommates = [] } = useQuery({ queryKey: ["roommates"], queryFn: fetchRoommates })
  const remaining = roommates.filter((r) => !likedIds.includes(r.id) && !dislikedIds.includes(r.id))
  const [topCard, nextCard] = remaining

  const swipe = useSwipe((dir) => {
    if (!topCard) return
    const { id, name } = topCard
    saveSwipe(id, dir === "right" ? "like" : "dislike")
    sendSwipe(id, dir)
      .then((matched) => {
        if (matched) {
          toast.success(`It's a match with ${name}!`)
          // So Matches and the share dialog show them straight away
          queryClient.invalidateQueries({ queryKey: ["matches"] })
        } else if (dir === "right") {
          toast.success(`You liked ${name}!`)
        }
      })
      .catch(() => toast.error("Couldn't save your swipe"))
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
    sharedWith: (roommate: Roommate) =>
      getSharedTraits(cardFromOnboarding(myAnswers ?? {}), roommate),
    like: () => dismiss("right"),
    dislike: () => dismiss("left"),
    startOver: reset,
  }
}
