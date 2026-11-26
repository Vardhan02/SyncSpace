import { useQueries } from "@tanstack/react-query"

import { fetchLikes } from "@/services/landlordService"

export function useListingLikes(houseIds: string[]) {
  const results = useQueries({
    queries: houseIds.map((id) => ({
      queryKey: ["listing-likes", id],
      queryFn: () => fetchLikes(id),
    })),
  })

  return Object.fromEntries(houseIds.map((id, index) => [id, results[index].data ?? []]))
}
