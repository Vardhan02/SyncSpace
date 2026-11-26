import { ClipboardList, X } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { ApplicationCard } from "@/components/applications/ApplicationCard"
import { useLandlordApplications } from "@/hooks/useApplications"
import { cn } from "@/lib/utils"

type Tab = "new" | "confirmed"

export function ApplicationsPage() {
  const [searchParams] = useSearchParams()
  // The listing page links here with ?house=<id> to show just that listing's applications.
  const houseId = searchParams.get("house")
  const [tab, setTab] = useState<Tab>("new")

  const all = useLandlordApplications()
    .filter((item) => !houseId || item.house.id === houseId)
    .toSorted((a, b) => b.application.submittedAt.localeCompare(a.application.submittedAt))
  const waiting = all.filter((item) => item.decision !== "confirmed")
  const confirmed = all.filter((item) => item.decision === "confirmed")
  const shown = tab === "new" ? waiting : confirmed
  const houseTitle = all[0]?.house.title

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          Applications
        </h1>
        <p className="pt-1 text-[14px] text-muted-foreground">
          Matched tenants who want to rent one of your houses together.
        </p>
      </div>

      {houseId ? (
        <Link
          to="/landlord/applications"
          className="flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-[#e7e5de]"
        >
          {houseTitle ?? "This listing"}
          <X className="size-3.5" aria-label="Show all listings" />
        </Link>
      ) : null}

      <div className="flex gap-1 rounded-full bg-secondary p-1 sm:w-fit">
        {(
          [
            ["new", "New", waiting.length],
            ["confirmed", "Confirmed", confirmed.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-[14px] font-medium transition-colors sm:flex-none",
              tab === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label} <span className="text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="flex flex-col gap-3">
          {shown.map((item) => (
            <ApplicationCard key={item.application.id} {...item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
          <ClipboardList className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="pt-3 text-[16px] font-semibold text-foreground">
            {tab === "new" ? "No new applications" : "Nothing confirmed yet"}
          </p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            {tab === "new"
              ? "When two matched tenants both apply for one of your houses, they'll show up here."
              : "Applications you confirm will show up here."}
          </p>
        </div>
      )}
    </div>
  )
}
