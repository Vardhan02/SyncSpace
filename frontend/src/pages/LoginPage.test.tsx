import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginPage } from "@/pages/LoginPage"
import { useAuthStore } from "@/stores/authStore"

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
    useAuthStore.setState({ user: null, accounts: [] })
    vi.clearAllMocks()
  })

  it("shows errors when email and password are empty", async () => {
    renderLogin()
    await logIn("", "")

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
  })

  it("shows an error for a wrong password", async () => {
    renderLogin()
    await logIn("tenant@syncspace.test", "wrong-password")

    expect(toast.error).toHaveBeenCalledWith("That email and password don't match. Try again.")
    expect(useAuthStore.getState().user).toBeNull()
    expect(screen.queryByText("Tenant home")).not.toBeInTheDocument()
  })

  it("sends a tenant to the houses page", async () => {
    renderLogin()
    await logIn("tenant@syncspace.test", "password123")

    expect(await screen.findByText("Tenant home")).toBeInTheDocument()
  })

  it("sends a landlord to the landlord page", async () => {
    renderLogin()
    await logIn("landlord@syncspace.test", "password123")

    expect(await screen.findByText("Landlord home")).toBeInTheDocument()
  })
})
