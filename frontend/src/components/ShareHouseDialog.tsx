import { Check } from "lucide-react"

import { Avatar } from "@/components/matches/MatchList"
import { Modal } from "@/components/Modal"
import { Button } from "@/components/ui/button"
import type { House, Match } from "@/types"

type ShareHouseDialogProps = {
  house: House | null
  matches: Match[]
  sentTo: string[]
  onSend: (matchId: string) => void
  onClose: () => void
}

export function ShareHouseDialog({
  house,
  matches,
  sentTo,
  onSend,
  onClose,
}: ShareHouseDialogProps) {
  return (
    <Modal
      open={house !== null}
      title="Send to a match"
      description={house ? `Share ${house.title} with someone you matched with.` : undefined}
      onClose={onClose}
    >
      {matches.length > 0 ? (
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {matches.map((m) => {
            const sent = sentTo.includes(m.id)
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-0"
              >
                <Avatar roommate={m.roommate} size="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{m.roommate.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{m.roommate.course}</p>
                </div>
                <Button
                  className="h-9 rounded-[10px] px-4 text-[13px] font-medium disabled:opacity-100"
                  variant={sent ? "outline" : "default"}
                  disabled={sent}
                  onClick={() => onSend(m.id)}
                >
                  {sent ? (
                    <>
                      <Check className="size-4" /> Sent
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-4 text-[14px] text-muted-foreground">
          No matches yet. Match with a roommate to share houses.
        </p>
      )}
    </Modal>
  )
}
