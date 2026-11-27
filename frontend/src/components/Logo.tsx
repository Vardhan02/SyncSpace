import { cn } from "@/lib/utils"

type LogoProps = {
  className?: string
  markClassName?: string
  showWordmark?: boolean
}

export function Logo({ className, markClassName, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className={cn("size-7 shrink-0", markClassName)}
        aria-hidden="true"
      >
        <path
          d="M3 26V15l8-8 8 8v11zM13 26V15l8-8 8 8v11z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-[18px] font-semibold tracking-[-0.5px]">syncspace</span>
      ) : null}
    </span>
  )
}
