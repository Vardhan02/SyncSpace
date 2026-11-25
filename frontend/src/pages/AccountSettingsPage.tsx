import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { Modal } from "@/components/Modal"
import { ProfileSection } from "@/components/profile/ProfileParts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/authStore"
import { useLandlordStore } from "@/stores/landlordStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useProfileStore } from "@/stores/profileStore"
import type { User } from "@/types"

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters"),
    repeat: z.string(),
  })
  .refine((values) => values.next === values.repeat, {
    path: ["repeat"],
    message: "The passwords don't match",
  })

type DetailsValues = z.infer<typeof detailsSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function AccountSettingsPage() {
  const user = useAuthStore((state) => state.user) as User
  const profilePath = user.role === "landlord" ? "/landlord/profile" : "/profile"

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        to={profilePath}
        className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Your profile
      </Link>

      <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground md:text-[30px]">
        Account settings
      </h1>

      <DetailsForm user={user} />
      <PasswordForm />
      <DeleteAccount user={user} />
    </div>
  )
}

function DetailsForm({ user }: { user: User }) {
  const updateAccount = useAuthStore((state) => state.updateAccount)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: user.name, email: user.email },
  })

  function onSubmit(values: DetailsValues) {
    const error = updateAccount(values)
    if (error) {
      setError("email", { message: error })
      return
    }
    reset(values)
    toast.success("Account details saved")
  }

  return (
    <ProfileSection title="Account details" description="Your name and the email you log in with.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>
        <Button type="submit" disabled={!isDirty} className="h-11 rounded-[12px] px-5 text-[15px] font-medium sm:w-fit">
          Save changes
        </Button>
      </form>
    </ProfileSection>
  )
}

function PasswordForm() {
  const changePassword = useAuthStore((state) => state.changePassword)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", repeat: "" },
  })

  function onSubmit(values: PasswordValues) {
    const error = changePassword(values.current, values.next)
    if (error) {
      setError("current", { message: error })
      return
    }
    reset()
    toast.success("Password changed")
  }

  return (
    <ProfileSection title="Password">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="current" label="Current password" error={errors.current?.message}>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.current)}
            {...register("current")}
          />
        </FormField>
        <FormField id="next" label="New password" error={errors.next?.message}>
          <Input
            id="next"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={Boolean(errors.next)}
            {...register("next")}
          />
        </FormField>
        <FormField id="repeat" label="Repeat new password" error={errors.repeat?.message}>
          <Input
            id="repeat"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.repeat)}
            {...register("repeat")}
          />
        </FormField>
        <Button type="submit" className="h-11 rounded-[12px] px-5 text-[15px] font-medium sm:w-fit">
          Change password
        </Button>
      </form>
    </ProfileSection>
  )
}

function DeleteAccount({ user }: { user: User }) {
  const navigate = useNavigate()
  const deleteAccount = useAuthStore((state) => state.deleteAccount)
  const removeRecord = usePreferencesStore((state) => state.remove)
  const removeContact = useProfileStore((state) => state.removeContact)
  const removeLandlord = useLandlordStore((state) => state.removeLandlord)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!deleting) return
    navigate("/", { replace: true })
    // The account is only removed once the landing page has replaced this one. Removing it
    // while this page is still up makes the logged-in check send us to the login page.
    return () => {
      removeRecord(user.id)
      removeContact(user.id)
      removeLandlord(user.id)
      deleteAccount()
      window.scrollTo(0, 0)
      toast.success("Your account has been deleted")
    }
  }, [deleting, navigate, user.id, removeRecord, removeContact, removeLandlord, deleteAccount])

  return (
    <ProfileSection
      title="Delete account"
      description={
        user.role === "landlord"
          ? "Removes your profile and the listings you added. Tenants won't see them any more."
          : "Removes your profile, so other tenants won't see you any more."
      }
    >
      <Button
        variant="outline"
        className="h-11 rounded-[12px] border-destructive/40 px-5 text-[15px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-fit"
        onClick={() => setConfirming(true)}
      >
        Delete my account
      </Button>

      <Modal
        open={confirming}
        title="Delete your account?"
        description="Everything you've saved goes with it. This can't be undone."
        onClose={() => setConfirming(false)}
      >
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 flex-1 rounded-[12px] bg-destructive text-[15px] font-medium text-white hover:bg-destructive/90"
            onClick={() => setDeleting(true)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </ProfileSection>
  )
}

function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
    </div>
  )
}
