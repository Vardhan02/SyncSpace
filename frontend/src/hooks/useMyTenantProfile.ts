import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMyTenantProfile, saveTenantAnswers, uploadTenantPhoto } from "@/services/tenantService"
import { usePhotoStore } from "@/stores/photoStore"
import type { TenantOnboarding } from "@/types"

export const TENANT_PHOTO_GROUP = "tenant-profile"

// Once it's uploaded the server copy is the real one, so drop the one in memory
export function forgetPickedTenantPhoto() {
  for (const photo of usePhotoStore.getState().groups[TENANT_PHOTO_GROUP] ?? []) URL.revokeObjectURL(photo.url)
  usePhotoStore.getState().setGroup(TENANT_PHOTO_GROUP, [])
}

// Same key as useMyContact: both read GET /api/tenants/me
const key = ["me", "tenant"]

export function useMyTenantProfile() {
  return useQuery({ queryKey: key, queryFn: getMyTenantProfile })
}

export function useSaveTenantProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    // PUT needs every answer, so `values` is the whole profile, not just the edited section
    mutationFn: async ({ values, photo }: { values: TenantOnboarding; photo?: File }) => {
      await saveTenantAnswers(values)
      if (photo) {
        await uploadTenantPhoto(photo)
        forgetPickedTenantPhoto()
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
