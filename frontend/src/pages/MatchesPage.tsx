import { Search } from "lucide-react"

import { ChatPanel } from "@/components/matches/ChatPanel"
import { MatchList } from "@/components/matches/MatchList"
import { Input } from "@/components/ui/input"
import { useMatches } from "@/controllers/useMatches"
import { cn } from "@/lib/utils"

export function MatchesPage() {
  const {
    matches,
    unreadCount,
    selected,
    search,
    setSearch,
    unreadOnly,
    setUnreadOnly,
    openChat,
    closeChat,
  } = useMatches()

  const filters = [
    { label: "All", unread: false },
    { label: `Unread (${unreadCount})`, unread: true },
  ]

  return (
    <div className="-mt-2 -mb-32 flex h-[calc(100dvh-77px)] min-h-0 w-full flex-col items-center gap-4 md:-mt-5 md:-mb-10 md:h-[calc(100dvh-82px)]">
      <div
        className={cn(
          "w-full shrink-0 flex-wrap items-center gap-3 md:flex md:flex-nowrap md:gap-4",
          selected ? "hidden" : "flex"
        )}
      >
        <h1 className="mr-auto text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
          Your matches
        </h1>

        <div className="relative order-last w-full md:order-none md:w-70">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-placeholder"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name"
            aria-label="Search matches"
            className="h-11 pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 md:order-last">
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              aria-pressed={unreadOnly === filter.unread}
              className={cn(
                "h-9 rounded-full border px-3 text-[13px] font-medium transition-colors md:h-11 md:px-4 md:text-[14px]",
                unreadOnly === filter.unread
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-white text-foreground hover:bg-secondary"
              )}
              onClick={() => setUnreadOnly(filter.unread)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 w-screen flex-1 overflow-hidden border-t border-border bg-white">
        <div
          className={cn(
            "w-full md:block md:w-[340px] md:border-r md:border-border lg:w-[400px]",
            selected && "hidden"
          )}
        >
          <MatchList matches={matches} selectedId={selected?.id} onOpen={openChat} />
        </div>
        <div className={cn("min-w-0 flex-1 md:block", !selected && "hidden")}>
          <ChatPanel match={selected} onBack={closeChat} />
        </div>
      </div>
    </div>
  )
}
