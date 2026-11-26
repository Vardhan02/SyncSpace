import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"

import { GuestOnly } from "@/components/GuestOnly"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession } from "@/test/server"
import type { UserRole } from "@/types"

function openAt(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/" element={<p>Landing page</p>} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/signup" element={<p>Signup page</p>} />
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
    openAt()
    expect(screen.getByText("Landing page")).toBeInTheDocument()
  })

  it("sends a logged-in tenant to the houses", () => {
    logIn("tenant", false)
    openAt()
    expect(screen.getByText("Houses")).toBeInTheDocument()
  })

  it("sends a logged-in landlord to their listings", () => {
    logIn("landlord", false)
    openAt()
    expect(screen.getByText("Landlord home")).toBeInTheDocument()
  })

  it("sends someone who hasn't finished onboarding back to it", () => {
    logIn("tenant", true)
    openAt()
    expect(screen.getByText("Onboarding")).toBeInTheDocument()
  })

  it("keeps logged-in users off the login and signup pages", () => {
    logIn("tenant", false)
    openAt("/login")
    expect(screen.getByText("Houses")).toBeInTheDocument()
  })

  it("still shows login and signup to people who aren't logged in", () => {
    openAt("/signup")
    expect(screen.getByText("Signup page")).toBeInTheDocument()
  })
})
