import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"

import { GuestOnly } from "@/components/GuestOnly"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession } from "@/test/server"
import type { UserRole } from "@/types"

function openLanding() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/" element={<p>Landing page</p>} />
        </Route>
        <Route path="/onboarding" element={<p>Onboarding</p>} />
        <Route path="/houses" element={<p>Houses</p>} />
        <Route path="/landlord" element={<p>Landlord home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function logIn(role: UserRole, firstLogin: boolean) {
  const session = fakeSession(role)
  useAuthStore.getState().startSession({ ...session, user: { ...session.user, firstLogin } })
}

describe("GuestOnly", () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it("shows the landing page to people who aren't logged in", () => {
    openLanding()
    expect(screen.getByText("Landing page")).toBeInTheDocument()
  })

  it("sends a logged-in tenant to the houses", () => {
    logIn("tenant", false)
    openLanding()
    expect(screen.getByText("Houses")).toBeInTheDocument()
  })

  it("sends a logged-in landlord to their listings", () => {
    logIn("landlord", false)
    openLanding()
    expect(screen.getByText("Landlord home")).toBeInTheDocument()
  })

  it("sends someone who hasn't finished onboarding back to it", () => {
    logIn("tenant", true)
    openLanding()
    expect(screen.getByText("Onboarding")).toBeInTheDocument()
  })
})
