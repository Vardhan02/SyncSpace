import { RoommateDetails } from "@/components/roommate/RoommateDetails"
import { cn } from "@/lib/utils"
import type { Roommate } from "@/types"

export function ApplicantAvatar({ tenant, className }: { tenant: Roommate; className?: string }) {
  const initials = tenant.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-foreground",
        className
      )}
    >
      {tenant.photo ? (
        <img src={tenant.photo} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

// One tenant's full profile, as the landlord sees it when reviewing an application.
export function ApplicantProfile({ tenant }: { tenant: Roommate }) {
  const studies = [tenant.course, tenant.university].filter(Boolean).join(" · ")

  return (
    <section className="flex flex-col overflow-hidden rounded-[20px] border border-border">
      <div className="flex items-center gap-4 border-b border-border p-5 sm:p-6">
        <ApplicantAvatar tenant={tenant} className="size-16 text-[20px]" />
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold text-foreground">
            {tenant.name}
            {tenant.age ? <span className="font-normal text-muted-foreground">, {tenant.age}</span> : null}
          </h2>
          {studies ? <p className="text-[14px] text-muted-foreground">{studies}</p> : null}
        </div>
      </div>

      {tenant.bio ? (
        <RoommateDetails roommate={tenant} />
      ) : (
        <p className="p-6 text-[14px] text-muted-foreground">
          This tenant hasn't finished their profile yet.
        </p>
      )}
    </section>
  )
}
