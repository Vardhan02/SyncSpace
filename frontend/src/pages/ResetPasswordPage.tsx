import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, errorMessage } from "@/lib/api"
import { readResetLink } from "@/lib/resetLink"
import { resetPassword } from "@/services/authService"
import { useAuthStore } from "@/stores/authStore"

const resetSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    repeat: z.string(),
  })
  .refine((values) => values.password === values.repeat, {
    path: ["repeat"],
    message: "The passwords don't match",
  })

type ResetValues = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const endSession = useAuthStore((state) => state.logout)
  // Read once, then take the token out of the address bar so it isn't left in the history
  const [link] = useState(() => {
    const result = readResetLink(window.location.hash)
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname)
    return result
  })
  const [expired, setExpired] = useState(!link || "expired" in link)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", repeat: "" },
  })

  async function onSubmit({ password }: ResetValues) {
    if (!link || !("token" in link)) return
    try {
      await resetPassword(link.token, password)
    } catch (error) {
      // A plain 401 means the link's token has run out
      if (error instanceof ApiError && error.status === 401) setExpired(true)
      else toast.error(errorMessage(error))
      return
    }
    // Whoever was logged in on this browser logs in again with the new password
    endSession()
    toast.success("Password changed. Log in with your new password.")
    navigate("/login", { replace: true })
  }

  if (expired) {
    return (
      <AuthLayout title="This link has expired" description="Reset links only work once, for a short while.">
        <div className="flex flex-1 flex-col justify-end gap-3 px-5 pt-7 pb-6 md:px-10 md:pb-10 lg:px-0 lg:pb-0">
          <Link
            to="/forgot-password"
            className="flex h-12.5 w-full items-center justify-center rounded-[12px] bg-primary text-[15px] font-medium text-primary-foreground hover:bg-primary/85"
          >
            Send me a new link
          </Link>
          <p className="pt-2 text-center text-[13px] text-placeholder">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-foreground">
              Back to log in
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" description="You'll use it to log in from now on.">
      <form
        className="flex flex-1 flex-col justify-between gap-10 px-5 pt-7 pb-6 md:px-10 md:pb-10 lg:px-0 lg:pb-0"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex w-full flex-col gap-7">
          <div className="flex w-full flex-col">
            <Label htmlFor="password">New password</Label>
            <div className="pt-1.5">
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </div>
            {errors.password ? <p className="pt-1.5 text-[13px] text-destructive">{errors.password.message}</p> : null}
          </div>

          <div className="flex w-full flex-col">
            <Label htmlFor="repeat">Repeat new password</Label>
            <div className="pt-1.5">
              <Input
                id="repeat"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.repeat)}
                {...register("repeat")}
              />
            </div>
            {errors.repeat ? <p className="pt-1.5 text-[13px] text-destructive">{errors.repeat.message}</p> : null}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-12.5 w-full rounded-[12px] text-[15px] font-medium">
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  )
}
