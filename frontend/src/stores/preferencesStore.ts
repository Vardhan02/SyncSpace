import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { ListingDraft, TenantPreferences } from "@/types"

export type OnboardingRecord = {
  step: number
  completed: boolean
  tenant: Partial<TenantPreferences>
  listing: Partial<ListingDraft>
}

type PreferencesState = {
  records: Record<string, OnboardingRecord>
  setStep: (userId: string, step: number) => void
  updateTenant: (userId: string, patch: Partial<TenantPreferences>) => void
  updateListing: (userId: string, patch: Partial<ListingDraft>) => void
  complete: (userId: string) => void
  restart: (userId: string) => void
}

export const emptyRecord: OnboardingRecord = {
  step: 0,
  completed: false,
  tenant: {},
  listing: {},
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => {
      // Always merge into the latest saved record, so quick changes don't overwrite each other.
      function update(userId: string, change: (record: OnboardingRecord) => Partial<OnboardingRecord>) {
        set((state) => {
          const record = { ...emptyRecord, ...state.records[userId] }
          return { records: { ...state.records, [userId]: { ...record, ...change(record) } } }
        })
      }

      return {
        records: {},
        setStep: (userId, step) => update(userId, () => ({ step })),
        updateTenant: (userId, patch) =>
          update(userId, (record) => ({ tenant: { ...record.tenant, ...patch } })),
        updateListing: (userId, patch) =>
          update(userId, (record) => ({ listing: { ...record.listing, ...patch } })),
        complete: (userId) => update(userId, () => ({ completed: true })),
        // Keeps the saved answers, so the form opens already filled in.
        restart: (userId) => update(userId, () => ({ completed: false, step: 0 })),
      }
    },
    { name: "syncspace-preferences" }
  )
)
