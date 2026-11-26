import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Modal } from "@/components/Modal"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/authStore"

// Asks before logging out, so a stray tap on the header doesn't sign anyone out.
export function LogoutButton() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const [confirming, setConfirming] = useState(false)

  function handleLogout() {
    setConfirming(false)
    logout()
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
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </Modal>
    </>
  )
}
