import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
})

type SignupValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  function onSubmit(_values: SignupValues) {
    toast.success("Account created. You can log in now.")
    navigate("/login")
  }

  return (
    <AuthLayout
      title="Create your account"
      description="It only takes a minute to get started."
    >
      <form
        className="flex flex-1 flex-col justify-between gap-10 px-5 pb-6 pt-7 md:px-10 md:pb-10 lg:px-0 lg:pb-0"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex w-full flex-col gap-7">
          <div className="flex w-full flex-col">
            <Label htmlFor="name">Full name</Label>
            <div className="pt-1.5">
              <Input
                id="name"
                autoComplete="name"
                placeholder="Enter your full name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </div>
            {errors.name ? (
              <p className="pt-1.5 text-[13px] text-destructive">
                {errors.name.message}
              </p>
            ) : null}
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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </div>
            {errors.password ? (
              <p className="pt-1.5 text-[13px] text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12.5 w-full rounded-[12px] text-[15px] font-medium"
          >
            Create account
          </Button>
          <p className="pt-2 text-center text-[13px] text-placeholder">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground"
            >
              Log in
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
