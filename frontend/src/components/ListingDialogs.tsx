import { Heart } from "lucide-react"

import { Modal } from "@/components/Modal"
import { Button } from "@/components/ui/button"

type LikesDialogProps = {
  open: boolean
  title: string
  names: string[]
  onClose: () => void
}

// Names only, as the spec says: no contact details until an application is confirmed.
export function LikesDialog({ open, title, names, onClose }: LikesDialogProps) {
  return (
    <Modal
      open={open}
      title={`${names.length} ${names.length === 1 ? "like" : "likes"}`}
      description={`Tenants who liked ${title}.`}
      onClose={onClose}
    >
      {names.length > 0 ? (
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {names.map((name) => (
            <li
              key={name}
              className="flex items-center gap-3 border-b border-border py-3 text-[15px] last:border-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold">
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 py-4 text-[14px] text-muted-foreground">
          <Heart className="size-4" aria-hidden="true" />
          No likes yet. They'll show up here as tenants find the listing.
        </p>
      )}
    </Modal>
  )
}

type DeleteDialogProps = {
  open: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteListingDialog({ open, title, onClose, onConfirm }: DeleteDialogProps) {
  return (
    <Modal
      open={open}
      title="Delete this listing?"
      description={`${title} will be removed and tenants won't see it any more. This can't be undone.`}
      onClose={onClose}
    >
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="h-11 flex-1 rounded-[12px] bg-destructive text-[15px] font-medium text-white hover:bg-destructive/90"
          onClick={onConfirm}
        >
          Delete
        </Button>
      </div>
    </Modal>
  )
}
