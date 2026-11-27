import { useState } from "react"

import { HouseCard } from "@/components/HouseCard"
import { ShareHouseDialog } from "@/components/ShareHouseDialog"
import { SearchBar } from "@/components/SearchBar"
import { useHouseLikes } from "@/controllers/useHouseLikes"
import { useShareHouse } from "@/controllers/useShareHouse"
import { useHouses } from "@/hooks/useMyListings"
import { cn } from "@/lib/utils"

export function HousesPage() {
  const rankedHouses = useHouses()
  const [query, setQuery] = useState("")
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  const { likedIds, toggleLike } = useHouseLikes()

  const { shareHouse, matches, sentTo, openShare, closeShare, send } = useShareHouse()

  const filters = [
    { label: "All", likedOnly: false },
    { label: `Liked (${likedIds.length})`, likedOnly: true },
  ]

  const search = query.trim().toLowerCase()
  const visibleHouses = rankedHouses.filter((house) => {
    if (showLikedOnly && !likedIds.includes(house.id)) return false
    if (!search) return true
    return house.title.toLowerCase().includes(search) || house.area.toLowerCase().includes(search)
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
          <SearchBar
            className="sm:w-70"
            placeholder="Search by area or name"
            label="Search houses"
            value={query}
            onChange={setQuery}
          />
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
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
          {visibleHouses.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              liked={likedIds.includes(house.id)}
              onToggleLike={() => toggleLike(house.id)}
              onShare={() => openShare(house)}
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

      <ShareHouseDialog
        house={shareHouse}
        matches={matches}
        sentTo={sentTo}
        onSend={send}
        onClose={closeShare}
      />
    </div>
  )
}
