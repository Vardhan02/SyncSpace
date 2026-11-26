import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginPage } from "@/pages/LoginPage"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, lastRequestBody, respondWith } from "@/test/server"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/houses" element={<p>Tenant home</p>} />
        <Route path="/landlord" element={<p>Landlord home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

async function logIn(email: string, password: string) {
  const user = userEvent.setup()
  if (email) await user.type(screen.getByLabelText("Email"), email)
  if (password) await user.type(screen.getByLabelText("Password"), password)
  await user.click(screen.getByRole("button", { name: "Log in" }))
}

describe("LoginPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("shows errors when email and password are empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    renderLogin()
    await logIn("", "")

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("shows the server's message for a wrong password", async () => {
    respondWith(400, { message: "wrong email or password" })
    renderLogin()
    await logIn("someone@example.com", "wrong-password")

    expect(toast.error).toHaveBeenCalledWith("Wrong email or password")
    expect(useAuthStore.getState().user).toBeNull()
    expect(screen.queryByText("Tenant home")).not.toBeInTheDocument()
  })

  it("says so when the server can't be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"))
    renderLogin()
    await logIn("someone@example.com", "password123")

    expect(toast.error).toHaveBeenCalledWith("Can't reach the server. Check your connection and try again.")
  })

  it("sends the email and password, then keeps the session", async () => {
    respondWith(200, fakeSession("tenant"))
    renderLogin()
    await logIn("someone@example.com", "password123")

    await screen.findByText("Tenant home")
    expect(lastRequestBody()).toEqual({ email: "someone@example.com", password: "password123" })
    expect(useAuthStore.getState().accessToken).toBe("access-token")
    expect(useAuthStore.getState().user?.role).toBe("tenant")
  })

  it("sends a landlord to the landlord page", async () => {
    respondWith(200, fakeSession("landlord"))
    renderLogin()
    await logIn("someone@example.com", "password123")

    expect(await screen.findByText("Landlord home")).toBeInTheDocument()
  })
})
