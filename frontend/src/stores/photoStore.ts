import { create } from "zustand"

import { useAuthStore } from "@/stores/authStore"

export type Photo = { id: string; url: string; name: string }

// Photos only live in memory until they're uploaded to the backend, so they're gone after
// a refresh. Groups keep e.g. the profile photo apart from house photos.
export const usePhotoStore = create<{
  groups: Record<string, Photo[]>
  setGroup: (group: string, photos: Photo[]) => void
}>()((set) => ({
  groups: {},
  setGroup: (group, photos) => set((state) => ({ groups: { ...state.groups, [group]: photos } })),
}))

// The groups aren't per account, so a new login in the same tab must not see the last
// person's photos
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id === previous.user?.id) return
  for (const photo of Object.values(usePhotoStore.getState().groups).flat()) {
    URL.revokeObjectURL(photo.url)
  }
  usePhotoStore.setState({ groups: {} })
})
