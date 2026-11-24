import { create } from "zustand"
import { persist } from "zustand/middleware"

// Mock data can't really be deleted, so we remember which listings the landlord removed.
type LandlordState = {
  deletedIds: string[]
  deleteListing: (houseId: string) => void
}

export const useLandlordStore = create<LandlordState>()(
  persist(
    (set) => ({
      deletedIds: [],
      deleteListing: (houseId) =>
        set((state) => ({ deletedIds: [...state.deletedIds, houseId] })),
    }),
    { name: "syncspace-landlord" }
  )
)
