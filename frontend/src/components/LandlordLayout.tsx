import { ClipboardList, House } from "lucide-react"

import { AppLayout } from "@/components/AppLayout"
import type { NavTab } from "@/components/AppLayout"

const tabs: NavTab[] = [
  { to: "/landlord/listings", label: "My listings", icon: House },
  { to: "/landlord/applications", label: "Applications", icon: ClipboardList },
]

export function LandlordLayout() {
  return <AppLayout tabs={tabs} homePath="/landlord/listings" profilePath="/landlord/profile" />
}
