import { create } from "zustand"
import { persist } from "zustand/middleware"

type RoommateState = {
  likedIds: string[]
  dislikedIds: string[]
  swipe: (roommateId: string, direction: "like" | "dislike") => void
  reset: () => void
}

export const useRoommateStore = create<RoommateState>()(
  persist(
    (set) => ({
      likedIds: [],
      dislikedIds: [],
      swipe: (roommateId, direction) =>
        set((state) => {
          if (
            state.likedIds.includes(roommateId) ||
            state.dislikedIds.includes(roommateId)
          )
            return state
          return direction === "like"
            ? { likedIds: [...state.likedIds, roommateId] }
            : { dislikedIds: [...state.dislikedIds, roommateId] }
        }),
      reset: () => set({ likedIds: [], dislikedIds: [] }),
    }),
    { name: "syncscape-roommates" }
  )
)

