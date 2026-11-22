import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { LandlordOnboarding, TenantOnboarding } from "@/types"

export type OnboardingRecord = {
  step: number
  completed: boolean
  tenant: Partial<TenantOnboarding>
  landlord: Partial<LandlordOnboarding>
}

type PreferencesState = {
  records: Record<string, OnboardingRecord>
  setStep: (userId: string, step: number) => void
  updateTenant: (userId: string, patch: Partial<TenantOnboarding>) => void
  updateLandlord: (userId: string, patch: Partial<LandlordOnboarding>) => void
  complete: (userId: string) => void
  restart: (userId: string) => void
}

export const emptyRecord: OnboardingRecord = {
  step: 0,
  completed: false,
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
        complete: (userId) => update(userId, () => ({ completed: true })),
        // Keeps the saved answers, so the form opens already filled in.
        restart: (userId) => update(userId, () => ({ completed: false, step: 0 })),
      }
    },
    {
      name: "syncspace-preferences",
      // v1 renamed the fields to match the database, so older drafts can't be reused.
      version: 1,
      migrate: (persisted) => {
        const old = persisted as { records?: Record<string, { completed?: boolean }> }
        const records = Object.fromEntries(
          Object.entries(old.records ?? {}).map(([id, record]) => [
            id,
            { ...emptyRecord, completed: Boolean(record.completed) },
          ])
        )
        return { records } as PreferencesState
      },
    }
  )
)
