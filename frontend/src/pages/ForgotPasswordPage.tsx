import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
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

  function onSubmit(_values: ForgotPasswordValues) {
    toast.success("If that email has an account, a reset link is on its way.")
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
            Send reset link
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
