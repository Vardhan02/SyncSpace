import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAuthStore } from "@/stores/authStore"
import { usePhotoStore } from "@/stores/photoStore"
import { fakeSession } from "@/test/server"

const photo = { id: "p-1", url: "blob:photo", name: "me.jpg" }

describe("photoStore", () => {
  beforeEach(() => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    usePhotoStore.setState({ groups: { "tenant-profile": [photo] } })
    URL.revokeObjectURL = vi.fn()
  })

  it("forgets the photos when the person logs out", () => {
    useAuthStore.getState().logout()

    expect(usePhotoStore.getState().groups).toEqual({})
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo")
  })

  it("keeps them when only the name changes", () => {
    const { user } = useAuthStore.getState()
    useAuthStore.getState().setUser({ ...user!, name: "New Name" })

    expect(usePhotoStore.getState().groups["tenant-profile"]).toEqual([photo])
  })
})
