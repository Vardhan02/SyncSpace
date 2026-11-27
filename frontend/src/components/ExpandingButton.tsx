import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

type ExpandingButtonProps = {
  icon: LucideIcon
  label: string
  to?: string
  onClick?: () => void
  tone?: "default" | "danger"
}

// A round icon button that stretches into a pill and shows its label on hover or focus.
// On touch screens there's no hover, so it stays an icon (the label is still read out).
export function ExpandingButton({ icon: Icon, label, to, onClick, tone = "default" }: ExpandingButtonProps) {
  const className = cn(
    "group flex h-9 items-center rounded-full border px-2.5 text-[14px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    tone === "danger"
      ? "border-destructive/30 text-destructive hover:bg-destructive/10"
      : "border-border text-foreground hover:bg-secondary"
  )

  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-20 group-focus-visible:opacity-100">
        {label}
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} aria-label={label} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {content}
    </button>
  )
}
