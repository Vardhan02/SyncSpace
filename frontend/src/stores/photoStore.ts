import { create } from "zustand"

import { useAuthStore } from "@/stores/authStore"

// `url` is a local preview, `file` is what gets uploaded
export type Photo = { id: string; url: string; name: string; file: File }

// Photos only live in memory until they're uploaded to the backend, so they're gone after
// a refresh. Groups keep e.g. the profile photo apart from house photos.
export const usePhotoStore = create<{
  groups: Record<string, Photo[]>
  setGroup: (group: string, photos: Photo[]) => void
}>()((set) => ({
  groups: {},
  setGroup: (group, photos) => set((state) => ({ groups: { ...state.groups, [group]: photos } })),
}))

// Once a group is uploaded the server copy is the real one, so drop the one in memory
export function forgetPhotos(group: string) {
  for (const photo of usePhotoStore.getState().groups[group] ?? []) URL.revokeObjectURL(photo.url)
  usePhotoStore.getState().setGroup(group, [])
}

// The groups aren't per account, so a new login in the same tab must not see the last
// person's photos
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id === previous.user?.id) return
  for (const photo of Object.values(usePhotoStore.getState().groups).flat()) {
    URL.revokeObjectURL(photo.url)
  }
  usePhotoStore.setState({ groups: {} })
})
