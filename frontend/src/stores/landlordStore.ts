import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AddedListing } from "@/services/landlordService"
import type { LandlordOnboarding } from "@/types"

// Mock data can't really be changed, so we remember which listings the landlord added,
// removed and edited, and apply that on top.
type LandlordState = {
  added: AddedListing[]
  deletedIds: string[]
  edits: Record<string, Partial<LandlordOnboarding>>
  addListing: (listing: AddedListing) => void
  deleteListing: (houseId: string) => void
  editListing: (houseId: string, form: Partial<LandlordOnboarding>) => void
  removeLandlord: (landlordId: string) => void
}

export const useLandlordStore = create<LandlordState>()(
  persist(
    (set) => ({
      added: [],
      deletedIds: [],
      edits: {},
      addListing: (listing) => set((state) => ({ added: [...state.added, listing] })),
      deleteListing: (houseId) =>
        set((state) => ({ deletedIds: [...state.deletedIds, houseId] })),
      editListing: (houseId, form) =>
        set((state) =>
          state.added.some((listing) => listing.id === houseId)
            ? { added: state.added.map((listing) => (listing.id === houseId ? { ...listing, form } : listing)) }
            : { edits: { ...state.edits, [houseId]: form } }
        ),
      // Takes down the listings a landlord added when their account is deleted.
      removeLandlord: (landlordId) =>
        set((state) => ({ added: state.added.filter((listing) => listing.landlordId !== landlordId) })),
    }),
    { name: "syncspace-landlord" }
  )
)
