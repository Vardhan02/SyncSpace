import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { LandlordOnboarding, TenantOnboarding } from "@/types"

// Onboarding answers kept in this browser as a draft until Finish sends them
export type OnboardingRecord = {
  step: number
  tenant: Partial<TenantOnboarding>
  landlord: Partial<LandlordOnboarding>
}

type PreferencesState = {
  records: Record<string, OnboardingRecord>
  setStep: (userId: string, step: number) => void
  updateTenant: (userId: string, patch: Partial<TenantOnboarding>) => void
  updateLandlord: (userId: string, patch: Partial<LandlordOnboarding>) => void
  remove: (userId: string) => void
}

export const emptyRecord: OnboardingRecord = {
  step: 0,
  tenant: {},
  landlord: {},
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
        updateLandlord: (userId, patch) =>
          update(userId, (record) => ({ landlord: { ...record.landlord, ...patch } })),
        remove: (userId) =>
          set((state) => ({
            records: Object.fromEntries(Object.entries(state.records).filter(([id]) => id !== userId)),
          })),
      }
    },
    {
      name: "syncspace-preferences",
      // v1 renamed the fields to match the database, so older drafts can't be reused.
      // v2 dropped `completed`: the backend says whether onboarding is done.
      version: 2,
      migrate: (persisted, version) => {
        const old = persisted as { records?: Record<string, OnboardingRecord & { completed?: boolean }> }
        const records = Object.fromEntries(
          Object.entries(old.records ?? {}).map(([id, { completed: _completed, ...record }]) => [
            id,
            version < 1 ? emptyRecord : record,
          ])
        )
        return { records } as PreferencesState
      },
    }
  )
)
