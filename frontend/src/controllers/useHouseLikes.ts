import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useHouses } from "@/hooks/useMyListings"
import { likeHouse, unlikeHouse } from "@/services/houseService"

export function useHouseLikes() {
  const queryClient = useQueryClient()
  const houses = useHouses()
  const likedIds = houses.filter((house) => house.likedByMe).map((house) => house.id)

  async function toggleLike(houseId: string) {
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
