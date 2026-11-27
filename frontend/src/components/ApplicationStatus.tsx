import { Clock, Lock, Mail, Phone, UserRound, X } from "lucide-react"

import { useLandlordContact, useMyApplication } from "@/hooks/useApplications"
import type { House } from "@/types"

// Bottom of the house page for tenants: where their application stands, and the
// landlord's contact details once it's confirmed.
export function ApplicationStatus({ house }: { house: House }) {
  const mine = useMyApplication(house.id)
  const landlord = useLandlordContact(house.id, mine?.status === "confirmed")
  const partner = mine?.partnerName.split(" ")[0]

  if (mine?.status === "confirmed" && landlord) {
    return (
      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-[14px] font-semibold text-foreground">
          You're in! The landlord confirmed you and {partner}.
        </p>
        <ul className="flex flex-col gap-2 text-[14px] text-foreground">
          <li className="flex items-center gap-2.5">
            <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {landlord.landlordName}
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a href={`mailto:${landlord.email}`} className="truncate underline underline-offset-4">
              {landlord.email}
            </a>
          </li>
          {landlord.phone ? (
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${landlord.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">
                {landlord.phone}
              </a>
            </li>
          ) : null}
        </ul>
      </div>
    )
  }

  if (mine?.status === "pending") {
    return (
      <div className="mt-5 flex gap-2.5 border-t border-border pt-5">
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-[13px] leading-4.75 text-muted-foreground">
          You and {partner} applied. You'll get the landlord's contact details here once they confirm.
        </p>
      </div>
    )
  }

  if (mine?.status === "ignored") {
    return (
      <div className="mt-5 flex gap-2.5 border-t border-border pt-5">
        <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-[13px] leading-4.75 text-muted-foreground">
          The landlord went with someone else for this house.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5 flex gap-2.5 border-t border-border pt-5">
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-[13px] leading-4.75 text-muted-foreground">
        The landlord's contact details are shared once they confirm your application.
      </p>
    </div>
  )
}
