import { useState } from "react"
import { toast } from "sonner"

import { ProfileSection } from "@/components/profile/ProfileParts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMyContact, useUpdateContact } from "@/hooks/useMyContact"
import { errorMessage } from "@/lib/api"
import { isValidPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { MyContact } from "@/services/profileService"

type ContactSectionProps = {
  email: string
  description: string
  toggleLabel: string
}

export function ContactSection({ email, description, toggleLabel }: ContactSectionProps) {
  const { data: contact, isPending, isError, refetch } = useMyContact()

  return (
    <ProfileSection title="Contact" description={description}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-foreground">Email</p>
          <p className="text-[15px] text-foreground">{email}</p>
        </div>

        {isPending ? (
          <p className="text-[14px] text-muted-foreground">Loading your phone number…</p>
        ) : isError ? (
          <div className="flex items-center gap-3">
            <p className="text-[14px] text-muted-foreground">Couldn't load your phone number.</p>
            <Button variant="outline" className="h-8 rounded-full px-3 text-[13px]" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <PhoneFields contact={contact} toggleLabel={toggleLabel} />
        )}
      </div>
    </ProfileSection>
  )
}

function PhoneFields({ contact, toggleLabel }: { contact: MyContact; toggleLabel: string }) {
  const saved = contact.phone ?? ""
  const [phone, setPhone] = useState(saved)
  const { mutate, isPending } = useUpdateContact()

  function savePhone() {
    const cleaned = phone.trim()
    if (cleaned === saved) return
    // A phone number is required, so a bad or empty one goes back to the saved number
    if (!isValidPhone(cleaned)) {
      setPhone(saved)
      toast.error("Enter a valid phone number")
      return
    }
    mutate(
      { phone: cleaned },
      {
        onSuccess: () => toast.success("Phone number saved"),
        onError: (error) => {
          setPhone(saved)
          toast.error(errorMessage(error))
        },
      }
    )
  }

  function saveVisibility(phoneVisible: boolean) {
    mutate({ phoneVisible }, { onError: (error) => toast.error(errorMessage(error)) })
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+353 87 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s]/g, "").slice(0, 20))}
          onBlur={savePhone}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
          }}
        />
      </div>

      <Switch
        label={toggleLabel}
        checked={contact.phoneVisible}
        disabled={!saved || isPending}
        hint={saved ? undefined : "Add a phone number first."}
        onChange={saveVisibility}
      />
    </>
  )
}

type SwitchProps = {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function Switch({ label, hint, checked, disabled, onChange }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={cn("text-[14px] text-foreground", disabled && "text-muted-foreground")}>{label}</p>
        {hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40",
          checked ? "bg-primary" : "bg-[#d3d1c7]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  )
}
