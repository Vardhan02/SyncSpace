import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { deleteListing, getListing, getListingLikes, getMyListings } from "@/services/listingService"

export function useMyListingSummaries() {
  return useQuery({ queryKey: ["listings", "mine"], queryFn: getMyListings })
}

export function useListing(houseId: number) {
  return useQuery({
    queryKey: ["listings", houseId],
    queryFn: () => getListing(houseId),
    enabled: Number.isInteger(houseId),
  })
}

// Only fetched while the likes pop-up is open
export function useListingLikes(houseId: number | null) {
  return useQuery({
    queryKey: ["listings", houseId, "likes"],
    queryFn: () => getListingLikes(houseId as number),
    enabled: houseId !== null,
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteListing,
    onSuccess: (_result, houseId) => {
      queryClient.removeQueries({ queryKey: ["listings", houseId] })
      return queryClient.invalidateQueries({ queryKey: ["listings", "mine"] })
    },
  })
}
