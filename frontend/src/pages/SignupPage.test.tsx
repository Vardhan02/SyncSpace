import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignupPage } from "@/pages/SignupPage"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, lastRequestBody, respondWith } from "@/test/server"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderSignup(url = "/signup") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<p>Onboarding</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

async function fillIn({ phone = "+353 87 123 4567" } = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Full name"), "Test User")
  await user.type(screen.getByLabelText("Email"), "someone@example.com")
  await user.type(screen.getByLabelText("Phone number"), phone)
  await user.type(screen.getByLabelText("Password"), "password123")
  await user.click(screen.getByRole("button", { name: /Create/ }))
}

describe("SignupPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("checks the phone number before calling the server", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    renderSignup()
    await fillIn({ phone: "abc" })

    expect(await screen.findByText("Enter a valid phone number")).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("creates the account and goes to onboarding", async () => {
    respondWith(201, fakeSession("tenant"))
    renderSignup()
    await fillIn()

    expect(await screen.findByText("Onboarding")).toBeInTheDocument()
    expect(lastRequestBody()).toEqual({
      role: "tenant",
      name: "Test User",
      email: "someone@example.com",
      phone: "+353 87 123 4567",
      password: "password123",
      phoneVisible: false,
    })
    expect(useAuthStore.getState().accessToken).toBe("access-token")
  })

  it("sends the landlord role from the landing page link", async () => {
    respondWith(201, fakeSession("landlord"))
    renderSignup("/signup?role=landlord")
    await fillIn()

    await screen.findByText("Onboarding")
    expect(lastRequestBody().role).toBe("landlord")
  })

  it("marks the email when it's already taken", async () => {
    respondWith(422, { message: "an account with this email already exists" })
    renderSignup()
    await fillIn()

    expect(await screen.findByText("There's already an account with this email")).toBeInTheDocument()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("sends people to log in when their email needs confirming first", async () => {
    respondWith(202, { message: "check your email to confirm your account" })
    renderSignup()
    await fillIn()

    expect(await screen.findByText("Login page")).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith("Check your email to confirm your account, then log in.")
    expect(useAuthStore.getState().user).toBeNull()
  })
})
