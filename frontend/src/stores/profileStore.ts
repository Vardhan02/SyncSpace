import { create } from "zustand"
import { persist } from "zustand/middleware"

import users from "@/mocks/users.json"

// Mirrors profile_contacts: phone is required at sign-up but hidden unless the user turns it on.
export type Contact = {
  phone: string
  phoneVisible: boolean
}

type ProfileState = {
  contacts: Record<string, Contact>
  updateContact: (userId: string, patch: Partial<Contact>) => void
  removeContact: (userId: string) => void
}

export const emptyContact: Contact = { phone: "", phoneVisible: false }

// The mock users come with a phone number already shared, so the demo has something to show.
const mockContacts: Record<string, Contact> = Object.fromEntries(
  users.map((user) => [user.id, { phone: user.phone, phoneVisible: true }])
)

export function contactFor(contacts: Record<string, Contact>, userId: string) {
  return contacts[userId] ?? mockContacts[userId] ?? emptyContact
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      contacts: {},
      updateContact: (userId, patch) =>
        set((state) => ({
          contacts: {
            ...state.contacts,
            [userId]: { ...contactFor(state.contacts, userId), ...patch },
          },
        })),
      removeContact: (userId) =>
        set((state) => ({
          contacts: Object.fromEntries(Object.entries(state.contacts).filter(([id]) => id !== userId)),
        })),
    }),
    { name: "syncspace-profile" }
  )
)
