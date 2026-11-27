import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { ApplicantProfile } from "@/components/applications/ApplicantProfile"
import { useRoommateProfile } from "@/controllers/useRoommateProfile"

export function RoommateProfilePage() {
  const { roommateId = "" } = useParams()
  const { roommate, isLoading, isError } = useRoommateProfile(roommateId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link
        to="/matches"
        className="flex w-fit items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Matches
      </Link>

      {roommate ? (
        <ApplicantProfile tenant={roommate} />
      ) : (
        <p className="py-16 text-center text-[14px] text-muted-foreground">
          {isLoading
            ? "Loading profile..."
            : isError
              ? "Couldn't load this profile"
              : "This roommate isn't available"}
        </p>
      )}
    </div>
  )
}
