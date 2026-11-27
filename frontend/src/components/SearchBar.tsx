import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  // Width and placement come from the page
  className?: string
}

// The pill-shaped search field used on every page that has one
export function SearchBar({ value, onChange, placeholder, label, className }: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-placeholder"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={label}
        className="h-11 rounded-full pr-4 pl-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
