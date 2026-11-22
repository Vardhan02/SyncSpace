import { CalendarDays, Cat, CircleDollarSign, Moon, Sparkles, Sun } from "lucide-react"
import type { ReactNode } from "react"

import type { Roommate } from "@/types"

// VIEW: About / Details / Interests sections. Used in both the phone pop-up
// and the laptop right-hand panel of RoommateCard. Display only, no logic.

export function RoommateDetails({ roommate }: { roommate: Roommate }) {
  const moveIn = new Date(roommate.moveIn).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6 md:p-8">
      <Section title="About">
        <p className="text-[14px] leading-relaxed text-foreground sm:text-[15px]">
          {roommate.bio}
        </p>
      </Section>

      <Section title="Details">
        <div className="grid grid-cols-2 gap-3">
          <Detail
            icon={<CircleDollarSign className="size-4" />}
            label="Budget"
            value={`€${roommate.budget}/mo`}
          />
          <Detail icon={<CalendarDays className="size-4" />} label="Move in" value={moveIn} />
          <Detail
            icon={
              roommate.sleepSchedule === "Early bird" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )
            }
            label="Sleep"
            value={roommate.sleepSchedule}
          />
          <Detail
            icon={<Sparkles className="size-4" />}
            label="Cleanliness"
            value={roommate.cleanliness}
          />
        </div>
      </Section>

      <Section title="Interests">
        <div className="flex flex-wrap gap-2">
          {roommate.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground sm:text-[13px]"
            >
              {interest}
            </span>
          ))}

          {roommate.pets && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground">
              <Cat className="size-3" aria-hidden="true" />
              Has pets
            </span>
          )}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-white px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-[13px] font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
