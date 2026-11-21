import { create } from "zustand"

export type Photo = { id: string; url: string; name: string }

// Photos only live in memory until there's a backend (Supabase storage) to upload them to,
// so they're gone after a refresh. Groups keep e.g. the profile photo apart from house photos.
export const usePhotoStore = create<{
  groups: Record<string, Photo[]>
  setGroup: (group: string, photos: Photo[]) => void
}>()((set) => ({
  groups: {},
  setGroup: (group, photos) => set((state) => ({ groups: { ...state.groups, [group]: photos } })),
}))
