import { ArrowLeft, Check, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ApplicantProfile } from "@/components/applications/ApplicantProfile"
import { Modal } from "@/components/Modal"
import { Button } from "@/components/ui/button"
import {
  useDecideApplication,
  useLandlordApplication,
} from "@/hooks/useApplications"
import { useMyContact } from "@/hooks/useMyContact"
import { formatDate } from "@/lib/format"
import { useAuthStore } from "@/stores/authStore"

export function ApplicationDetailPage() {
  const { applicationId = "" } = useParams()
  const navigate = useNavigate()
  const item = useLandlordApplication(applicationId)
  const decide = useDecideApplication()
  const name = useAuthStore((state) => state.user?.name) ?? ""
  // What the tenants will see once it's confirmed
  const { data: me } = useMyContact()
  const contact = me && { name, email: me.email, phone: me.phoneVisible ? me.phone : null }
  const [dialog, setDialog] = useState<"confirm" | "ignore" | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [applicationId])

  if (!item) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-[22px] font-semibold text-foreground">This application isn't available</h1>
        <Link to="/landlord/applications" className="text-[14px] font-medium text-foreground underline">
          Back to applications
        </Link>
      </div>
    )
  }

  const { application, house, tenants, decision } = item
  const names = `${tenants[0].name.split(" ")[0]} and ${tenants[1].name.split(" ")[0]}`

  async function confirm() {
    try {
      await decide(application.id, "confirmed")
    } catch {
      toast.error("Couldn't confirm this application")
      return
    }
    setDialog(null)
    toast.success(`Confirmed. ${names} can now see your contact details.`)
  }

  async function ignore() {
    try {
      await decide(application.id, "ignored")
    } catch {
      toast.error("Couldn't ignore this application")
      return
    }
    toast.success("Application removed")
    navigate("/landlord/applications", { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/landlord/applications"
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Applications
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
            {tenants[0].name} & {tenants[1].name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
            <Link
              to={`/landlord/listings/${house.id}`}
              className="flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {house.title}
            </Link>
            <span>Applied {formatDate(application.submittedAt, "long")}</span>
          </p>
        </div>

        {decision === "confirmed" ? (
          <p className="flex items-center gap-2 rounded-[12px] bg-secondary px-4 py-3 text-[14px] text-foreground">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            Confirmed. {names} can see your contact details.
          </p>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-[12px] px-5 text-[15px] font-medium md:flex-none"
              onClick={() => setDialog("ignore")}
            >
              Ignore
            </Button>
            <Button
              className="h-11 flex-1 rounded-[12px] px-5 text-[15px] font-medium md:flex-none"
              onClick={() => setDialog("confirm")}
            >
              Confirm
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {tenants.map((tenant) => (
          <ApplicantProfile key={tenant.id} tenant={tenant} />
        ))}
      </div>

      <Modal
        open={dialog === "confirm"}
        title="Confirm this application?"
        description={`${names} will get your contact details so you can arrange the next steps.`}
        onClose={() => setDialog(null)}
      >
        {contact ? (
          <dl className="flex flex-col rounded-[14px] bg-secondary px-4 py-1 text-[14px]">
            <div className="flex justify-between gap-3 border-b border-border py-2.5">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{contact.name}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-border py-2.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate text-foreground">{contact.email}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{contact.phone ?? "Not shared"}</dd>
            </div>
          </dl>
        ) : null}
        <p className="text-[13px] text-muted-foreground">
          You can choose whether your phone is shared on your profile page.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => setDialog(null)}
          >
            Cancel
          </Button>
          <Button className="h-11 flex-1 rounded-[12px] text-[15px] font-medium" onClick={confirm}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal
        open={dialog === "ignore"}
        title="Ignore this application?"
        description={`It'll be removed from your applications and ${names} won't get your details. This can't be undone.`}
        onClose={() => setDialog(null)}
      >
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => setDialog(null)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 flex-1 rounded-[12px] bg-destructive text-[15px] font-medium text-white hover:bg-destructive/90"
            onClick={ignore}
          >
            Ignore
          </Button>
        </div>
      </Modal>
    </div>
  )
}
