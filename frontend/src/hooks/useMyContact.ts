import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { updateAccount } from "@/services/accountService"
import type { AccountChanges } from "@/services/accountService"
import { getMyContact } from "@/services/profileService"
import type { MyContact } from "@/services/profileService"
import { useAuthStore } from "@/stores/authStore"
import type { UserRole } from "@/types"

const contactKey = (role: UserRole) => ["me", role]

export function useMyContact() {
  const role = useAuthStore((state) => state.user?.role) ?? "tenant"
  return useQuery({ queryKey: contactKey(role), queryFn: () => getMyContact(role) })
}

// PUT /api/me only sends back the user, so the saved phone is written into the cache here
export function useUpdateContact() {
  const role = useAuthStore((state) => state.user?.role) ?? "tenant"
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changes: Pick<AccountChanges, "phone" | "phoneVisible">) => updateAccount(changes),
    onSuccess: (_user, changes) => {
      queryClient.setQueryData<MyContact>(contactKey(role), (contact) => contact && { ...contact, ...changes })
    },
  })
}
