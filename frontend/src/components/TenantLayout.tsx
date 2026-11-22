import { HeartHandshake, House, Users } from "lucide-react"

import { AppLayout } from "@/components/AppLayout"
import type { NavTab } from "@/components/AppLayout"

const tabs: NavTab[] = [
  { to: "/houses", label: "Houses", icon: House },
  { to: "/roommate", label: "Roommate", icon: Users },
  { to: "/matches", label: "Matches", icon: HeartHandshake },
]

export function TenantLayout() {
  return <AppLayout tabs={tabs} homePath="/houses" profilePath="/profile" />
}
