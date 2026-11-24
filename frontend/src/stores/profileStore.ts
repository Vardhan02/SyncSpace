import { create } from "zustand"
import { persist } from "zustand/middleware"

// Mirrors profile_contacts: phone is optional and hidden unless the user turns it on.
export type Contact = {
  phone: string
  phoneVisible: boolean
}

type ProfileState = {
  contacts: Record<string, Contact>
  updateContact: (userId: string, patch: Partial<Contact>) => void
}

export const emptyContact: Contact = { phone: "", phoneVisible: false }

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      contacts: {},
      updateContact: (userId, patch) =>
        set((state) => ({
          contacts: {
            ...state.contacts,
            [userId]: { ...emptyContact, ...state.contacts[userId], ...patch },
          },
        })),
    }),
    { name: "syncspace-profile" }
  )
)
