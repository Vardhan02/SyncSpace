import { HeartHandshake, House, Users } from "lucide-react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"

import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"

const tabs = [
  { to: "/houses", label: "Houses", icon: House },
  { to: "/roommate", label: "Roommate", icon: Users },
  { to: "/matches", label: "Matches", icon: HeartHandshake },
]

export function TenantLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="mx-auto grid max-w-300 grid-cols-[1fr_auto] items-center gap-x-6 px-5 py-3 md:grid-cols-[1fr_auto_1fr] md:px-8">
          <Link to="/houses" aria-label="syncspace home" className="justify-self-start">
            <Logo className="text-foreground" />
          </Link>

          <nav className="hidden gap-1 md:flex">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            <NavLink
              to="/profile"
              aria-label="Open your profile"
              title={user?.name}
              className={({ isActive }) =>
                cn(
                  "flex size-9 items-center justify-center rounded-full text-[13px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-[#e7e5de]"
                )
              }
            >
              {initials}
            </NavLink>
            <Button
              variant="ghost"
              className="h-9 rounded-[10px] px-3 text-[14px] font-medium"
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-5 pt-6 pb-32 md:px-8 md:py-10">
        <Outlet />
      </main>

      <nav className="fixed bottom-5 left-1/2 z-20 flex w-[90%] -translate-x-1/2 gap-1 rounded-full border border-black/5 bg-white/65 p-1.5 shadow-[0_8px_30px_rgba(44,44,42,0.14)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
