import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(_values: LoginValues) {
    toast.success("Logged in")
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to find your next roommate."
    >
      <form
        className="flex flex-1 flex-col justify-between gap-10 px-5 pb-6 pt-7 md:px-10 md:pb-10 lg:px-0 lg:pb-0"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex w-full flex-col gap-7">
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

          <div className="flex w-full flex-col">
            <Label htmlFor="password">Password</Label>
            <div className="pt-1.5">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="pt-1.5 text-[13px] text-destructive">
                {errors.password.message}
              </p>
            ) : null}
            <div className="flex justify-end pt-2">
              <Link
                to="/forgot-password"
                className="text-[13px] font-normal text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12.5 w-full rounded-[12px] text-[15px] font-medium"
          >
            Log in
          </Button>
          <p className="pt-2 text-center text-[13px] text-placeholder">
            New here?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground"
            >
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
