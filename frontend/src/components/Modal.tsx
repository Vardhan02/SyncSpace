import { X } from "lucide-react"
import { useEffect, useId, useRef } from "react"
import type { ReactNode } from "react"

type ModalProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

// Built on the native <dialog>, which handles focus, Esc and the backdrop for us.
export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Pages often render more than one modal, so each needs its own title id.
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-md rounded-[20px] bg-white p-0 text-foreground shadow-[0_24px_60px_rgba(44,44,42,0.2)] backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[18px] font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="pt-1 text-[14px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
