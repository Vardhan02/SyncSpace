import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[12px] border border-input bg-transparent px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
