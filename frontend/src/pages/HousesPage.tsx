import { Search } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { HouseCard } from "@/components/HouseCard"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import houses from "@/mocks/houses.json"
import { useHouseStore } from "@/stores/houseStore"
import type { House } from "@/types"

const rankedHouses = (houses as House[]).toSorted(
  (a, b) => b.matchScore - a.matchScore
)

export function HousesPage() {
  const [query, setQuery] = useState("")
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  const likedIds = useHouseStore((state) => state.likedIds)
  const toggleLike = useHouseStore((state) => state.toggleLike)

  function handleShare(house: House) {
    toast.success(`Shared ${house.title} with your match`)
  }

  const filters = [
    { label: "All", likedOnly: false },
    { label: `Liked (${likedIds.length})`, likedOnly: true },
  ]

  const search = query.trim().toLowerCase()
  const visibleHouses = rankedHouses.filter((house) => {
    if (showLikedOnly && !likedIds.includes(house.id)) return false
    if (!search) return true
    return (
      house.title.toLowerCase().includes(search) ||
      house.area.toLowerCase().includes(search)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
            Houses in Cork
          </h1>
          <p className="pt-1 text-[14px] text-muted-foreground">
            {rankedHouses.length} listings, best match first
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-70">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-placeholder"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by area or name"
              aria-label="Search houses"
              className="h-11 pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={showLikedOnly === filter.likedOnly}
                className={cn(
                  "h-11 rounded-full border px-4 text-[14px] font-medium transition-colors",
                  showLikedOnly === filter.likedOnly
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-white text-foreground hover:bg-secondary"
                )}
                onClick={() => setShowLikedOnly(filter.likedOnly)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleHouses.length > 0 ? (
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {visibleHouses.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              liked={likedIds.includes(house.id)}
              onToggleLike={() => toggleLike(house.id)}
              onShare={() => handleShare(house)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
          <p className="text-[16px] font-semibold text-foreground">
            {showLikedOnly ? "No liked houses yet" : "No houses match your search"}
          </p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            {showLikedOnly
              ? "Tap the heart on a house to save it here."
              : "Try a different area, like Douglas or Bishopstown."}
          </p>
        </div>
      )}
    </div>
  )
}
