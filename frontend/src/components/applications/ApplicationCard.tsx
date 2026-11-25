import { ChevronRight, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { ApplicantAvatar } from "@/components/applications/ApplicantProfile"
import type { ApplicationDetails } from "@/hooks/useApplications"
import { formatDate } from "@/lib/format"

export function ApplicationCard({ application, house, tenants, decision }: ApplicationDetails) {
  return (
    <Link
      to={`/landlord/applications/${application.id}`}
      className="flex items-center gap-4 rounded-[16px] border border-border p-4 transition-colors hover:bg-[#faf9f6] sm:p-5"
    >
      <div className="flex shrink-0 -space-x-3">
        {tenants.map((tenant) => (
          <ApplicantAvatar
            key={tenant.id}
            tenant={tenant}
            className="size-12 border-2 border-white text-[15px]"
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[15px] leading-snug font-semibold text-foreground">
          {tenants[0].name} & {tenants[1].name}
        </p>
        <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {house.title}
        </p>
        <p className="text-[12px] text-placeholder">Applied {formatDate(application.submittedAt)}</p>
      </div>

      {decision === "confirmed" ? (
        <span className="hidden shrink-0 rounded-full bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground sm:inline">
          Confirmed
        </span>
      ) : (
        <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-foreground sm:inline">
          New
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
