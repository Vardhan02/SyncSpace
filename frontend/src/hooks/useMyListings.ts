import { getHouses } from "@/services/houseService"
import { useAuthStore } from "@/stores/authStore"

// Mock houses for the pages not on the backend yet: tenants browsing (/api/houses) and
// landlord applications (/api/applications). The landlord's own listings use useListings.

export function useMyListings() {
  const userId = useAuthStore((state) => state.user?.id) ?? ""
  return getHouses().filter((house) => house.landlordId === userId)
}

// Best match first
export function useHouses() {
  return getHouses()
}
