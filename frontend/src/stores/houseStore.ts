import { create } from "zustand"
import { persist } from "zustand/middleware"

type HouseState = {
  likedIds: string[]
  toggleLike: (houseId: string) => void
}

export const useHouseStore = create<HouseState>()(
  persist(
    (set) => ({
      likedIds: [],
      toggleLike: (houseId) =>
        set((state) => ({
          likedIds: state.likedIds.includes(houseId)
            ? state.likedIds.filter((id) => id !== houseId)
            : [...state.likedIds, houseId],
        })),
    }),
    { name: "syncscape-houses" }
  )
)
