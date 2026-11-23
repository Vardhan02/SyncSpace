import { BadgeCheck, House as HouseIcon, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SharedHouse } from "@/types"

export function SharedHouseCard({ shared, name }: { shared: SharedHouse; name: string }) {
  const { house, fromMe, sentAt } = shared

  return (
    <div className={cn("flex w-64 max-w-[85%] flex-col gap-1", fromMe ? "self-end items-end" : "self-start")}>
      <p className="px-1 text-[12px] text-muted-foreground">
        {fromMe ? "You" : name} shared a house · {formatDate(sentAt)}
      </p>

      <Link
        to={`/houses/${house.id}`}
        className={cn(
          "flex w-full flex-col gap-2 rounded-[16px] border border-border p-2 transition-colors hover:bg-secondary",
          fromMe ? "bg-secondary/60" : "bg-white"
        )}
      >
        <div className="grid h-28 grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-[12px]">
          <div className="col-span-2 row-span-2 flex items-center justify-center bg-[#e7e5de]">
            <HouseIcon className="size-6 text-[#b4b2a9]" aria-hidden="true" />
          </div>
          <div className="bg-[#efede6]" />
          <div className="bg-[#dcdad2]" />
        </div>

        <div className="px-1 pb-1">
          <p className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
            <span className="truncate">{house.title}</span>
            {house.verified && <BadgeCheck className="size-3.5 shrink-0" aria-label="Verified listing" />}
          </p>
          <p className="flex items-center gap-1 pt-0.5 text-[12px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            {house.area}, Cork
          </p>
          <p className="pt-1 text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">€{house.rent}</span> per month ·{" "}
            {house.roomType}
          </p>
        </div>
      </Link>
    </div>
  )
}
