import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  House as HouseIcon,
  Lock,
  MapPin,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Tell us how you live",
    text: "Budget, area, sleep schedule, how tidy you are. Takes about five minutes.",
  },
  {
    icon: Users,
    title: "Swipe on roommates",
    text: "See people who live the way you do. When you both swipe right, it's a match.",
  },
  {
    icon: HeartHandshake,
    title: "Pick a house together",
    text: "Share houses with your match. Once you both apply, it goes to the landlord.",
  },
]

const landlordPoints = [
  { icon: Users, text: "Applications come from matched pairs, not strangers" },
  { icon: BadgeCheck, text: "Listings get a verified badge once photos back up the amenities" },
  { icon: Lock, text: "Your contact details stay private until you confirm a pair" },
]

const buttonBase =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[12px] px-6 text-[15px] font-medium transition-colors"

export function LandingPage() {

  return (
    <div className="min-h-dvh bg-white text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-300 items-center justify-between px-5 py-3 md:px-8">
          <Logo className="text-foreground" />
          <nav className="flex items-center gap-2">
            <Link to="/login" className={cn(buttonBase, "h-10 px-4 text-[14px] hover:bg-secondary")}>
              Log in
            </Link>
            <Link to="/signup" className={cn(buttonBase, "h-10 bg-primary px-4 text-[14px] text-primary-foreground hover:bg-primary/85")}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-300 items-center gap-12 px-5 pt-14 pb-20 md:px-8 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div className="flex flex-col items-start">
            <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[13px] font-medium text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              Now in Cork
            </span>
            <h1 className="pt-6 text-[44px] leading-[1.02] font-semibold tracking-[-1.5px] md:text-[64px] md:tracking-[-2.5px]">
              Find your people.
              <br />
              <span className="text-[#888780]">& your place.</span>
            </h1>
            <p className="max-w-115 pt-6 text-[17px] leading-7 text-muted-foreground">
              Match with roommates who live the way you do, then pick a house and apply
              together. No more moving in with strangers.
            </p>
            <div className="flex w-full flex-col gap-3 pt-9 sm:w-auto sm:flex-row">
              <Link
                to="/signup"
                className={cn(buttonBase, "bg-primary text-primary-foreground hover:bg-primary/85")}
              >
                Get started
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link to="/login" className={cn(buttonBase, "border border-border hover:bg-secondary")}>
                I already have an account
              </Link>
            </div>
          </div>

          <HeroPreview />
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-[#f5f4f0]">
          <div className="mx-auto max-w-300 px-5 py-20 md:px-8">
            <h2 className="text-[30px] font-semibold tracking-[-0.8px] md:text-[38px]">How it works</h2>
            <p className="pt-2 text-[16px] text-muted-foreground">For students and renters looking for a room.</p>
            <ol className="grid gap-5 pt-10 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="flex flex-col gap-3 rounded-[20px] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] font-medium text-placeholder">Step {index + 1}</span>
                  </div>
                  <h3 className="pt-2 text-[18px] font-semibold">{title}</h3>
                  <p className="text-[15px] leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Landlords */}
        <section className="mx-auto grid max-w-300 items-center gap-10 px-5 py-20 md:px-8 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">For landlords</p>
            <h2 className="pt-3 text-[30px] leading-tight font-semibold tracking-[-0.8px] md:text-[38px]">
              Let your house to people who already get along.
            </h2>
            <p className="pt-4 text-[16px] leading-7 text-muted-foreground">
              List your house once. Tenants who match with each other apply as a pair, and you
              decide who gets your contact details.
            </p>
            <Link
              to="/signup?role=landlord"
              className={cn(buttonBase, "mt-8 bg-primary text-primary-foreground hover:bg-primary/85")}
            >
              List your house
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {landlordPoints.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 rounded-[16px] border border-border p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-[15px] leading-6">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing call to action */}
        <section className="px-5 pb-20 md:px-8">
          <div className="mx-auto flex max-w-300 flex-col items-center rounded-[28px] bg-primary px-6 py-16 text-center text-primary-foreground">
            <h2 className="text-[30px] font-semibold tracking-[-0.8px] md:text-[40px]">Ready to find your people?</h2>
            <p className="max-w-110 pt-3 text-[16px] text-[#b4b2a9]">
              Set up your profile and start swiping in a few minutes.
            </p>
            <Link
              to="/signup"
              className={cn(buttonBase, "mt-8 bg-white text-foreground hover:bg-[#e7e5de]")}
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-300 flex-col gap-2 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:justify-between md:px-8">
          <p>© 2026 SyncSpace</p>
          <p>Roommate matching for Cork</p>
        </div>
      </footer>
    </div>
  )
}

// A small mock-up of the app: a roommate card with a matched house tucked behind it.
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-110 pb-24" aria-hidden="true">
      <div className="absolute right-0 bottom-0 w-[72%] rotate-3 rounded-[20px] border border-border bg-white p-3 shadow-[0_12px_40px_rgba(44,44,42,0.10)]">
        <div className="flex h-36 items-center justify-center rounded-[14px] bg-[#e7e5de]">
          <HouseIcon className="size-8 text-[#b4b2a9]" />
        </div>
        <div className="flex items-center justify-between px-1 pt-3">
          <div>
            <p className="text-[14px] font-semibold">Bright 3-bed near UCC</p>
            <p className="text-[12px] text-muted-foreground">College Road · €750 / month</p>
          </div>
          <BadgeCheck className="size-4" />
        </div>
      </div>

      <div className="relative z-1 w-[82%] -rotate-2 rounded-[20px] border border-border bg-white p-5 shadow-[0_16px_50px_rgba(44,44,42,0.14)]">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-[18px] font-semibold">AK</span>
          <div>
            <p className="text-[17px] font-semibold">Aanya, 22</p>
            <p className="text-[13px] text-muted-foreground">MSc Data Science · UCC</p>
          </div>
        </div>
        <p className="pt-4 text-[14px] leading-5.5">
          Early riser who loves cooking big weekend breakfasts.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-4">
          {["Early bird", "Very tidy", "Cooking", "Hiking"].map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-[12px] bg-secondary px-3.5 py-2.5">
          <p className="text-[12px] text-muted-foreground">My ideal Friday night is…</p>
          <p className="text-[14px]">Board games and too much pasta.</p>
        </div>
        <div className="flex justify-center gap-4 pt-5">
          <span className="flex size-12 items-center justify-center rounded-full border border-border text-[18px] text-red-400">✕</span>
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-[18px] text-primary-foreground">♥</span>
        </div>
      </div>
    </div>
  )
}
