import {
  BookOpen,
  CalendarDays,
  Cigarette,
  CigaretteOff,
  DoorOpen,
  HeartHandshake,
  MapPin,
  Moon,
  PawPrint,
  ScrollText,
  Sparkles,
  Sun,
  Users,
  Volume2,
  Wallet,
} from "lucide-react"
import type { ReactNode } from "react"

import { formatBudgetRange, formatFullDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Roommate } from "@/types"

export function RoommateDetails({ roommate, shared }: { roommate: Roommate; shared: string[] }) {
  const lifestyle = [
    {
      icon: roommate.sleepSchedule === "Early bird" ? Sun : Moon,
      value: roommate.sleepSchedule,
    },
    { icon: Sparkles, value: roommate.cleanliness },
    { icon: Volume2, value: roommate.noiseTolerance },
    { icon: Users, value: roommate.socialStyle },
    { icon: BookOpen, value: roommate.studyPattern },
    { icon: DoorOpen, value: `Guests ${roommate.guests.toLowerCase()}` },
    {
      icon: roommate.smoking === "Non-smoker" ? CigaretteOff : Cigarette,
      value: roommate.smoking,
    },
    { icon: PawPrint, value: roommate.pets },
  ]

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6 md:p-8">
      <div className="grid grid-cols-2 gap-2.5">
        <Fact icon={<Wallet className="size-4" />} label="Budget" value={`${formatBudgetRange(roommate.budgetMin, roommate.budgetMax)}/mo`} />
        <Fact icon={<CalendarDays className="size-4" />} label="Move in" value={formatFullDate(roommate.moveIn)} />
        <Fact icon={<MapPin className="size-4" />} label="Areas" value={roommate.areas.join(", ")} />
        <Fact icon={<ScrollText className="size-4" />} label="Lease" value={roommate.leaseLength} />
      </div>

      {shared.length > 0 && (
        <Section title="In common with you">
          <div className="flex flex-wrap gap-2">
            {shared.map((item) => (
              <Chip key={item} highlight>
                <HeartHandshake className="size-3.5" aria-hidden="true" />
                {item}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Lifestyle">
        <div className="flex flex-wrap gap-2">
          {lifestyle.map(({ icon: Icon, value }) => (
            <Chip key={value}>
              <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {value}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="About me">
        <p className="text-[14px] leading-relaxed text-foreground sm:text-[15px]">{roommate.bio}</p>
      </Section>

      {roommate.prompts.map(({ prompt, answer }) => (
        <div key={prompt} className="rounded-[16px] bg-secondary px-4 py-4">
          <p className="text-[12px] font-medium text-muted-foreground">{prompt}</p>
          <p className="pt-1.5 text-[17px] leading-snug font-semibold text-foreground">{answer}</p>
        </div>
      ))}

      <Section title="Interests">
        <div className="flex flex-wrap gap-2">
          {roommate.interests.map((interest) => (
            <Chip key={interest} highlight={shared.includes(interest)}>
              {interest}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-white px-3 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[13px] leading-snug font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function Chip({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium sm:text-[13px]",
        highlight
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-border bg-white text-foreground"
      )}
    >
      {children}
    </span>
  )
}
