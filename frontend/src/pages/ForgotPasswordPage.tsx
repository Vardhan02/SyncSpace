import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/api"
import { requestPasswordReset } from "@/services/authService"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function send(email: string) {
    try {
      await requestPasswordReset(email.trim())
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }

  async function onSubmit({ email }: ForgotPasswordValues) {
    if (await send(email)) setSentTo(email.trim())
  }

  async function resend() {
    if (!sentTo) return
    setResending(true)
    if (await send(sentTo)) toast.success("Sent again")
    setResending(false)
  }

  // The backend answers the same whether or not the email has an account, so this does too
  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        description={`If ${sentTo} has an account, we've sent it a link to reset your password.`}
      >
        <div className="flex flex-1 flex-col justify-between gap-10 px-5 pt-7 pb-6 md:px-10 md:pb-10 lg:px-0 lg:pb-0">
          <p className="text-[14px] leading-5.5 text-muted-foreground">
            The link works once and only for a short while. Check your spam folder if it doesn't
            show up in a few minutes.
          </p>
          <div className="flex w-full flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={resending}
              className="h-12.5 w-full rounded-[12px] text-[15px] font-medium"
              onClick={resend}
            >
              {resending ? "Sending…" : "Send it again"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full text-[14px] font-medium"
              onClick={() => setSentTo(null)}
            >
              Use a different email
            </Button>
            <p className="pt-2 text-center text-[13px] text-placeholder">
              <Link to="/login" className="font-medium text-foreground">
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
    >
      <form
        className="flex flex-1 flex-col justify-between gap-10 px-5 pb-6 pt-7 md:px-10 md:pb-10 lg:px-0 lg:pb-0"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex w-full flex-col">
          <Label htmlFor="email">Email</Label>
          <div className="pt-1.5">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@email.com"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="pt-1.5 text-[13px] text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12.5 w-full rounded-[12px] text-[15px] font-medium"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
          <p className="pt-2 text-center text-[13px] text-placeholder">
            Remembered it?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground"
            >
              Back to log in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
