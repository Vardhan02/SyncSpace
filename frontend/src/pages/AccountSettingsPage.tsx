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
import { ApiError, errorMessage } from "@/lib/api"
import { changePassword, deleteAccount, updateAccount } from "@/services/accountService"
import { useAuthStore } from "@/stores/authStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import type { User } from "@/types"

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Keep it under 100 characters"),
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

// The backend answers a wrong password with 400, not 401
const wrongPassword = (error: unknown) => error instanceof ApiError && error.status === 400

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
  const setUser = useAuthStore((state) => state.setUser)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: user.name },
  })

  async function onSubmit(values: DetailsValues) {
    try {
      const updated = await updateAccount({ name: values.name })
      setUser(updated)
      reset({ name: updated.name })
      toast.success("Account details saved")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <ProfileSection title="Account details" description="Your name and the email you log in with.">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
        </FormField>
        <FormField id="email" label="Email" hint="Your email can't be changed.">
          <Input id="email" type="email" value={user.email} readOnly disabled />
        </FormField>
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="h-11 rounded-[12px] px-5 text-[15px] font-medium sm:w-fit"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </ProfileSection>
  )
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", repeat: "" },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await changePassword(values.current, values.next)
      reset()
      toast.success("Password changed")
    } catch (error) {
      if (wrongPassword(error)) setError("current", { message: "Your current password is wrong" })
      else toast.error(errorMessage(error))
    }
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
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-[12px] px-5 text-[15px] font-medium sm:w-fit"
        >
          {isSubmitting ? "Changing…" : "Change password"}
        </Button>
      </form>
    </ProfileSection>
  )
}

function DeleteAccount({ user }: { user: User }) {
  const navigate = useNavigate()
  const endSession = useAuthStore((state) => state.logout)
  const removeRecord = usePreferencesStore((state) => state.remove)
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    if (!deleted) return
    navigate("/", { replace: true })
    // Signing out while this page is still up would make the logged-in check send us to
    // the login page, so it waits until the landing page has replaced this one.
    return () => {
      removeRecord(user.id)
      endSession()
      window.scrollTo(0, 0)
      toast.success("Your account has been deleted")
    }
  }, [deleted, navigate, user.id, removeRecord, endSession])

  function close() {
    setConfirming(false)
    setPassword("")
    setError("")
  }

  async function confirmDelete() {
    if (!password) {
      setError("Enter your password")
      return
    }
    setSending(true)
    try {
      await deleteAccount(password)
      setDeleted(true)
    } catch (err) {
      setError(wrongPassword(err) ? "That password is wrong" : errorMessage(err))
      setSending(false)
    }
  }

  return (
    <ProfileSection
      title="Delete account"
      description={
        user.role === "landlord"
          ? "Removes your profile and your listings. Tenants won't see them any more."
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
        onClose={close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            confirmDelete()
          }}
          noValidate
        >
          <FormField id="delete-password" label="Your password" error={error}>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="h-11 flex-1 rounded-[12px] bg-destructive text-[15px] font-medium text-white hover:bg-destructive/90"
            >
              {sending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </form>
      </Modal>
    </ProfileSection>
  )
}

type FormFieldProps = { id: string; label: string; error?: string; hint?: string; children: ReactNode }

function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-[13px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
