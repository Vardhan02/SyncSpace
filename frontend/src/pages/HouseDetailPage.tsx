import { Heart, Lock } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"

import { HouseActions } from "@/components/HouseActions"
import { HouseOverview } from "@/components/HouseOverview"
import { ShareHouseDialog } from "@/components/ShareHouseDialog"
import { Button } from "@/components/ui/button"
import { useShareHouse } from "@/controllers/useShareHouse"
import { formatMatchLikes } from "@/lib/format"
import { getHouse } from "@/services/houseService"
import { useHouseStore } from "@/stores/houseStore"

export function HouseDetailPage() {
  const { houseId = "" } = useParams()
  const house = getHouse(houseId)
  const liked = useHouseStore((state) => state.likedIds.includes(houseId))
  const toggleLike = useHouseStore((state) => state.toggleLike)
  const { shareHouse, matches, sentTo, openShare, closeShare, send } = useShareHouse()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [houseId])

  if (!house) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-[22px] font-semibold text-foreground">This house isn't available</h1>
        <Link to="/houses" className="text-[14px] font-medium text-foreground underline">
          Back to all houses
        </Link>
      </div>
    )
  }

  return (
    <>
      <HouseOverview
        key={house.id}
        house={house}
        backTo="/houses"
        backLabel="All houses"
        actions={
          <HouseActions
            liked={liked}
            onToggleLike={() => toggleLike(house.id)}
            onShare={() => openShare(house)}
          />
        }
        aside={
          <>
            <p className="text-[28px] font-semibold tracking-[-0.5px] text-foreground">
              €{house.rent}
              <span className="text-[15px] font-normal text-muted-foreground"> / month</span>
            </p>

            {house.likedByMatches.length > 0 ? (
              <p className="flex items-center gap-1.5 pt-2 text-[13px] text-foreground">
                <Heart className="size-3.5 fill-red-500 text-red-500" aria-hidden="true" />
                {formatMatchLikes(house.likedByMatches)}
              </p>
            ) : null}

            <p className="pt-5 text-[14px] leading-5.25 text-muted-foreground">
              You apply for this house together with a matched roommate. Share it with a match, and
              once you both apply it goes to the landlord.
            </p>

            <Button
              className="mt-5 h-12.5 w-full rounded-[12px] text-[15px] font-medium"
              onClick={() => openShare(house)}
            >
              Share with a match
            </Button>

            <div className="mt-5 flex gap-2.5 border-t border-border pt-5">
              <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-[13px] leading-4.75 text-muted-foreground">
                The landlord's contact details are shared once they confirm your application.
              </p>
            </div>
          </>
        }
      />
      <ShareHouseDialog
        house={shareHouse}
        matches={matches}
        sentTo={sentTo}
        onSend={send}
        onClose={closeShare}
      />
    </>
  )
}
