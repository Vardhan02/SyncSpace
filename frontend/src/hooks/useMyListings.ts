import { useQuery } from "@tanstack/react-query"

import { fetchHouses } from "@/services/houseService"

// What tenants browse (GET /api/houses), best match first
export function useHouses() {
  const { data = [] } = useQuery({ queryKey: ["houses"], queryFn: fetchHouses })
  return data.toSorted((a, b) => b.matchScore - a.matchScore)
}
