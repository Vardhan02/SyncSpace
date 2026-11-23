import { getListings } from "@/services/landlordService"
import { useAuthStore } from "@/stores/authStore"
import { useLandlordStore } from "@/stores/landlordStore"
import { usePreferencesStore } from "@/stores/preferencesStore"

// The signed-in landlord's listings: mock data plus the one from onboarding, minus deleted ones.
export function useMyListings() {
  const userId = useAuthStore((state) => state.user?.id) ?? ""
  const onboarding = usePreferencesStore((state) => state.records[userId]?.landlord)
  const deletedIds = useLandlordStore((state) => state.deletedIds)

  return getListings(userId, onboarding).filter((house) => !deletedIds.includes(house.id))
}
