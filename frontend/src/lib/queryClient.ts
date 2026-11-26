import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // A 4xx won't fix itself, so only retry when the server or network had a problem
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
})

// Nothing loaded for one account should show up for the next one in the same tab
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) queryClient.clear()
})
