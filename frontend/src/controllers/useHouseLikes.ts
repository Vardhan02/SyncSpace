import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useHouses } from "@/hooks/useMyListings"
import { hasBackend } from "@/lib/api"
import { likeHouse, unlikeHouse } from "@/services/houseService"
import { useHouseStore } from "@/stores/houseStore"

export function useHouseLikes() {
  const queryClient = useQueryClient()
  const houses = useHouses()
  const localIds = useHouseStore((state) => state.likedIds)
  const toggleLocal = useHouseStore((state) => state.toggleLike)

  const likedIds = hasBackend
    ? houses.filter((house) => house.likedByMe).map((house) => house.id)
    : localIds

  async function toggleLike(houseId: string) {
    if (!hasBackend) return toggleLocal(houseId)
    try {
      if (likedIds.includes(houseId)) await unlikeHouse(houseId)
      else await likeHouse(houseId)
      await queryClient.invalidateQueries({ queryKey: ["houses"] })
    } catch {
      toast.error("Couldn't update your like")
    }
  }

  return { likedIds, toggleLike }
}
