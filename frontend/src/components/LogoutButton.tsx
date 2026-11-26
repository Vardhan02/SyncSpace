import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Modal } from "@/components/Modal"
import { Button } from "@/components/ui/button"
import { logout } from "@/services/authService"
import { useAuthStore } from "@/stores/authStore"

// Asks first, so a stray tap on the header doesn't sign anyone out.
export function LogoutButton() {
  const navigate = useNavigate()
  const endSession = useAuthStore((state) => state.logout)
  const [confirming, setConfirming] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    // Even if the server can't be reached, the person still gets logged out here.
    await logout().catch(() => {})
    endSession()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-9 rounded-full px-4 text-[14px] font-medium"
        onClick={() => setConfirming(true)}
      >
        Log out
      </Button>

      <Modal
        open={confirming}
        title="Log out?"
        description="You'll need your email and password to log back in."
        onClose={() => setConfirming(false)}
      >
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 flex-1 rounded-[12px] text-[15px] font-medium"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </Modal>
    </>
  )
}
