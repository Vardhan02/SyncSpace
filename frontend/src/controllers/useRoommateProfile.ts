import { useQuery } from "@tanstack/react-query"

import { fetchRoommate } from "@/services/roommateService"

export function useRoommateProfile(id: string) {
  const {
    data: roommate,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["roommates", id],
    queryFn: () => fetchRoommate(id),
  })

  return { roommate, isLoading, isError }
}
