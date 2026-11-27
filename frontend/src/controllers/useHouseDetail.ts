import { useQuery } from "@tanstack/react-query"

import { useHouses } from "@/hooks/useMyListings"
import { fetchHouse } from "@/services/houseService"

export function useHouseDetail(id: string) {
  const fromList = useHouses().find((house) => house.id === id)
  const { data } = useQuery({ queryKey: ["houses", id], queryFn: () => fetchHouse(id) })

  return data ?? fromList
}
