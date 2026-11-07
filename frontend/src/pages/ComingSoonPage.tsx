import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

type ComingSoonPageProps = {
  title: string
  showLogout?: boolean
}

export function ComingSoonPage({ title, showLogout = false }: ComingSoonPageProps) {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-foreground">
        {title}
      </h1>
      <p className="text-[14px] text-muted-foreground">
        This page is still being built.
      </p>
      {showLogout ? (
        <Button
          variant="outline"
          className="mt-4 h-11 rounded-[12px] px-5 text-[15px] font-medium"
          onClick={handleLogout}
        >
          Log out
        </Button>
      ) : null}
    </div>
  )
}
