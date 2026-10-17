import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

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
    <div className="flex min-h-dvh justify-center bg-white md:items-center md:bg-[#f5f4f0] md:p-6">
      <div className="flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white md:h-[844px] md:min-h-0 md:rounded-[32px] md:shadow-[0_12px_40px_rgba(44,44,42,0.08)]">
        <header className="flex h-11 shrink-0 items-center justify-between px-6">
          <p className="text-[13px] font-medium text-foreground">9:41</p>
          <p className="text-[13px] font-medium tracking-[0.12em] text-foreground">
            ●●●
          </p>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden px-5 pb-5 pt-[60px]"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="flex w-full flex-col gap-7">
            <div
              className="flex size-14 items-center justify-center rounded-[16px] bg-primary"
              aria-hidden="true"
            >
              <span className="text-[22px] font-semibold text-primary-foreground">
                S
              </span>
            </div>

            <div className="flex w-full flex-col">
              <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground">
                Welcome back
              </h1>
              <p className="pt-1.5 text-[14px] leading-[21px] text-muted-foreground">
                Log in to find your next roommate.
              </p>
            </div>

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
              className="h-[50px] w-full rounded-[12px] text-[15px] font-medium"
            >
              Log in
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[50px] w-full rounded-[12px] border-input bg-white text-[15px] font-medium text-foreground hover:bg-white"
              onClick={() => toast.message("Google sign-in is coming soon")}
            >
              Continue with Google
            </Button>
            <p className="pt-2 text-center text-[13px] text-[var(--placeholder)]">
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
      </div>
    </div>
  )
}
