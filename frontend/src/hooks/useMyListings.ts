import { useQuery } from "@tanstack/react-query"

import { hasBackend } from "@/lib/api"
import { fetchHouses } from "@/services/houseService"
import { getAllListings } from "@/services/landlordService"
import { useAuthStore } from "@/stores/authStore"
import { useLandlordStore } from "@/stores/landlordStore"
import { usePreferencesStore } from "@/stores/preferencesStore"

// Every listing with the landlords' changes applied: mock houses, onboarding listings
// and added ones, minus deleted ones. Tenants and landlords both read from this.
export function useAllListings() {
  const records = usePreferencesStore((state) => state.records)
  const added = useLandlordStore((state) => state.added)
  const edits = useLandlordStore((state) => state.edits)
  const deletedIds = useLandlordStore((state) => state.deletedIds)

  const onboarding = Object.fromEntries(
    Object.entries(records).map(([userId, record]) => [userId, record.landlord])
  )
  return getAllListings({ onboarding, added, edits, deletedIds })
}

// Just the signed-in landlord's listings.
export function useMyListings() {
  const userId = useAuthStore((state) => state.user?.id) ?? ""
  return useAllListings().filter((house) => house.landlordId === userId)
}

// What tenants browse: everything, best match first.
export function useHouses() {
  const listings = useAllListings()
  const { data = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: fetchHouses,
    enabled: hasBackend,
  })
  return (hasBackend ? data : listings).toSorted((a, b) => b.matchScore - a.matchScore)
}
