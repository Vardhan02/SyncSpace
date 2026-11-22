import { ChatPanel } from "@/components/matches/ChatPanel"
import { MatchList } from "@/components/matches/MatchList"
import { useMatches } from "@/controllers/useMatches"
import { cn } from "@/lib/utils"

export function MatchesPage() {
  const { matches, total, selected, search, setSearch, openChat, closeChat } = useMatches()

  return (
    // Same height trick as the roommate page so the page itself never scrolls.
    <div className="flex h-[calc(100dvh-213px)] min-h-0 w-full flex-col gap-4 py-2 md:h-[calc(100dvh-142px)]">
      <div className="shrink-0 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground sm:text-[26px] md:text-[30px]">
          Your matches
        </h1>
        <p className="pt-1 text-[12px] text-muted-foreground sm:text-[14px]">
          {total} people liked you back
        </p>
      </div>

      {/* Phone: list OR chat. md and up: list on the left, chat on the right. */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_12px_40px_rgba(44,44,42,0.08)]">
        <div className={cn("w-full md:block md:w-[340px] md:border-r md:border-border", selected && "hidden")}>
          <MatchList
            matches={matches}
            selectedId={selected?.id}
            search={search}
            onSearch={setSearch}
            onOpen={openChat}
          />
        </div>
        <div className={cn("min-w-0 flex-1 md:block", !selected && "hidden")}>
          <ChatPanel match={selected} onBack={closeChat} />
        </div>
      </div>
    </div>
  )
}
