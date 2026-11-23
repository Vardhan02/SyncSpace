import { Heart, RefreshCw, User, X as XIcon } from "lucide-react"

import { RoommateCard } from "@/components/roommate/RoommateCard"
import { useRoommateMatch } from "@/controllers/useRoommateMatch"

export function RoomateMatchPage() {
  const {
    topCard,
    nextCard,
    remainingCount,
    swipe,
    progress,
    sharedWith,
    like,
    dislike,
    startOver,
  } = useRoommateMatch()

  const { offset, rotation, transition } = swipe

  return (
    <div className="flex h-[calc(100dvh-213px)] min-h-0 w-full flex-col items-center gap-2 overflow-hidden py-2 md:h-[calc(100dvh-142px)]">
      <div className="w-full shrink-0 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-foreground sm:text-[26px] md:text-[30px]">
          Find a roommate
        </h1>
        <p className="pt-1 text-[12px] text-muted-foreground sm:text-[14px]">
          {remainingCount > 0
            ? `${remainingCount} people left · swipe right to like`
            : "You've seen everyone!"}
        </p>
      </div>

      {topCard ? (
        <>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <div className="relative h-full max-h-[620px] w-full max-w-[496px] touch-none select-none lg:max-h-[575px] lg:max-w-[920px]">
              {nextCard && (
                <RoommateCard
                  key={nextCard.id}
                  roommate={nextCard}
                  shared={sharedWith(nextCard)}
                  style={{
                    transform: `translateY(${14 * (1 - progress)}px) scale(${0.94 + progress * 0.06})`,
                    transition,
                  }}
                />
              )}

              <RoommateCard
                key={topCard.id}
                roommate={topCard}
                shared={sharedWith(topCard)}
                swipe={swipe}
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg)`,
                  transition,
                }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-8 pb-1">
            <button
              type="button"
              aria-label="Dislike"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-90 sm:size-16"
              onClick={dislike}
            >
              <XIcon className="size-7 text-rose-500 transition-transform group-hover:scale-110 sm:size-8" />
            </button>

            <button
              type="button"
              aria-label="Like"
              className="group flex size-14 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-90 sm:size-16"
              onClick={like}
            >
              <Heart className="size-7 fill-emerald-500 text-emerald-500 transition-transform group-hover:scale-110 sm:size-8" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-[20px] border border-dashed border-border px-6 text-center">
          <User className="size-10 text-muted-foreground" />
          <p className="mt-4 text-[16px] font-semibold text-foreground">No more roommates</p>
          <p className="pt-1 text-[14px] text-muted-foreground">
            You've swiped through everyone. Check your matches or start over.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-primary bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/80 active:scale-[0.98]"
            onClick={startOver}
          >
            <RefreshCw className="size-4" />
            Start over
          </button>
        </div>
      )}
    </div>
  )
}
