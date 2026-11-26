import { useQuery } from "@tanstack/react-query"

import { useHouses } from "@/hooks/useMyListings"
import { hasBackend } from "@/lib/api"
import { fetchHouse } from "@/services/houseService"

export function useHouseDetail(id: string) {
  const fromList = useHouses().find((house) => house.id === id)
  const { data } = useQuery({
    queryKey: ["houses", id],
    queryFn: () => fetchHouse(id),
    enabled: hasBackend,
  })

  return data ?? fromList
}
