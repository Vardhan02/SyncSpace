import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMyTenantProfile, saveTenantAnswers, uploadTenantPhoto } from "@/services/tenantService"
import { forgetPhotos } from "@/stores/photoStore"
import type { TenantOnboarding } from "@/types"

export const TENANT_PHOTO_GROUP = "tenant-profile"

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
        forgetPhotos(TENANT_PHOTO_GROUP)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
