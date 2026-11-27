import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-[13px] font-medium leading-normal text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }
