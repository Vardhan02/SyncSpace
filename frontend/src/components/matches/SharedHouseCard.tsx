import { BadgeCheck, Check, Heart, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { HousePhotoGrid } from "@/components/HousePhotoGrid"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SharedHouse } from "@/types"

type SharedHouseCardProps = {
  shared: SharedHouse
  name: string
  liked: boolean
  onLike: () => void
  applied: boolean
  onApply: () => void
}

export function SharedHouseCard({
  shared,
  name,
  liked,
  onLike,
  applied,
  onApply,
}: SharedHouseCardProps) {
  const { house, fromMe, sentAt } = shared
  // The landlord only gets the application once you've both applied
  const status = applied && shared.theyApplied ? (shared.applicationStatus ?? "pending") : null

  return (
    <div
      className={cn(
        "flex w-72 max-w-[90%] flex-col gap-1",
        fromMe ? "self-end items-end" : "self-start"
      )}
    >
      <p className="px-1 text-[12px] text-muted-foreground">
        {fromMe ? "You" : name} shared a house · {formatDate(sentAt)}
      </p>

      <div className="flex w-full items-center gap-2">
        <div
          className={cn(
            "flex w-full flex-col gap-2 rounded-[16px] border border-border p-2",
            fromMe ? "bg-secondary/60" : "bg-white"
          )}
        >
          <Link
            to={`/houses/${house.id}`}
            className="flex flex-col gap-2 rounded-[12px] transition-opacity hover:opacity-80"
          >
            <HousePhotoGrid houseId={house.id} coverPhoto={house.coverPhoto} className="h-28 gap-1 rounded-[12px]" />

            <div className="px-1 pb-1">
              <p className="flex items-center gap-1 text-[14px] font-semibold text-foreground">
                <span className="truncate">{house.title}</span>
                {house.verified && (
                  <BadgeCheck className="size-3.5 shrink-0" aria-label="Verified listing" />
                )}
              </p>
              <p className="flex items-center gap-1 pt-0.5 text-[12px] text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {house.area}, Cork
              </p>
              <p className="pt-1 text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">€{house.rent}</span> per month
                {house.roomType && ` · ${house.roomType}`}
              </p>
            </div>
          </Link>

          <Button
            className="h-9 w-full rounded-[10px] text-[13px] font-medium disabled:opacity-100"
            variant={applied ? "outline" : "default"}
            disabled={applied}
            onClick={onApply}
          >
            {applied ? (
              <>
                {status !== "ignored" ? <Check className="size-4" /> : null} {applyLabel(status)}
              </>
            ) : shared.theyApplied ? (
              `Apply too, ${name} applied`
            ) : (
              "Apply"
            )}
          </Button>
          {applied ? <p className="px-1 text-[12px] leading-4 text-muted-foreground">{applyNote(status, name)}</p> : null}
        </div>

        {!fromMe && (
          <button
            type="button"
            aria-label={liked ? "Unlike house" : "Like house"}
            aria-pressed={liked}
            onClick={onLike}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Heart className={cn("size-5", liked && "fill-[#ff3040] text-[#ff3040]")} />
          </button>
        )}
      </div>
    </div>
  )
}

type ApplicationStatus = SharedHouse["applicationStatus"]

function applyLabel(status: ApplicationStatus) {
  if (status === "pending") return "Sent to the landlord"
  if (status === "confirmed") return "Confirmed"
  if (status === "ignored") return "Not this time"
  return "Applied"
}

function applyNote(status: ApplicationStatus, name: string) {
  if (status === "pending") return "Waiting for the landlord to decide."
  if (status === "confirmed") return "The landlord said yes! Their contact details are on the house page."
  if (status === "ignored") return "The landlord went with someone else."
  return `Waiting for ${name} to apply. The landlord sees it once you both have.`
}
