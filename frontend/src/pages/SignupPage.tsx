import { zodResolver } from "@hookform/resolvers/zod"
import { House, User } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { AuthLayout } from "@/components/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { useProfileStore } from "@/stores/profileStore"

const signupSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\+?[\d\s]{7,20}$/.test(value), "Enter a valid phone number"),
  password: z.string().min(8, "Use at least 8 characters"),
})

type SignupValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const signup = useAuthStore((state) => state.signup)
  const updateContact = useProfileStore((state) => state.updateContact)
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      // The landing page's "List your house" button links here with ?role=landlord.
      role: searchParams.get("role") === "landlord" ? "landlord" : "tenant",
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  })
  const role = useWatch({ control, name: "role" })
  const isLandlord = role === "landlord"

  function onSubmit(values: SignupValues) {
    const user = signup(values)
    if (!user) {
      setError("email", { message: "There's already an account with this email" })
      return
    }

    if (values.phone) updateContact(user.id, { phone: values.phone })
    toast.success(`Welcome, ${user.name.split(" ")[0]}! Let's set up your profile.`)
    navigate("/onboarding", { replace: true })
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
            <p className="text-[13px] font-medium text-foreground">I'm a</p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                className={cn(
                  "text-[15px] font-medium transition-colors",
                  isLandlord ? "text-placeholder hover:text-foreground" : "text-foreground"
                )}
                onClick={() => setValue("role", "tenant")}
              >
                Tenant
              </button>
              {/* Works like a light/dark switch: the knob slides to whichever side is picked. */}
              <button
                type="button"
                role="switch"
                aria-checked={isLandlord}
                aria-label="Landlord account"
                onClick={() => setValue("role", isLandlord ? "tenant" : "landlord")}
                className="relative h-9 w-16 shrink-0 rounded-full border border-input bg-secondary outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "absolute top-0.75 left-0.75 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200",
                    isLandlord && "translate-x-7"
                  )}
                >
                  {isLandlord ? (
                    <House className="size-3.5" aria-hidden="true" />
                  ) : (
                    <User className="size-3.5" aria-hidden="true" />
                  )}
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "text-[15px] font-medium transition-colors",
                  isLandlord ? "text-foreground" : "text-placeholder hover:text-foreground"
                )}
                onClick={() => setValue("role", "landlord")}
              >
                Landlord
              </button>
            </div>
          </div>

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
            <Label htmlFor="phone">
              Phone number <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="pt-1.5">
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+353 87 123 4567"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </div>
            {errors.phone ? (
              <p className="pt-1.5 text-[13px] text-destructive">
                {errors.phone.message}
              </p>
            ) : (
              <p className="pt-1.5 text-[13px] text-muted-foreground">
                Hidden until you choose to share it.
              </p>
            )}
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
            {isLandlord ? "Create landlord account" : "Create tenant account"}
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
