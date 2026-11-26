import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getMyLandlordProfile, saveLandlordPreferences, uploadLandlordPhoto } from "@/services/landlordProfileService"
import { forgetPhotos } from "@/stores/photoStore"
import type { LandlordOnboarding } from "@/types"

export const LANDLORD_PHOTO_GROUP = "landlord-profile"
export const HOUSE_PHOTO_GROUP = "house"

// Same key as useMyContact: both read GET /api/landlords/me
const key = ["me", "landlord"]

export function useMyLandlordProfile() {
  return useQuery({ queryKey: key, queryFn: getMyLandlordProfile })
}

export function useSaveLandlordProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ values, photo }: { values: LandlordOnboarding; photo?: File }) => {
      await saveLandlordPreferences(values)
      if (photo) {
        await uploadLandlordPhoto(photo)
        forgetPhotos(LANDLORD_PHOTO_GROUP)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
