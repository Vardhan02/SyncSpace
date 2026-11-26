import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, lastRequestBody, respondWith } from "@/test/server"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }))

// The reset page reads the link from the real address bar, like it would in the browser
function openAt(path: string) {
  window.history.replaceState(null, "", path)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

function lastRequest() {
  const calls = vi.mocked(fetch).mock.calls
  const [url, init] = calls[calls.length - 1]
  return {
    route: `${init?.method} ${new URL(String(url)).pathname}`,
    auth: (init?.headers as Record<string, string>).Authorization,
  }
}

describe("Forgot password", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  it("asks for a reset email and says to check the inbox", async () => {
    respondWith(204)
    const user = openAt("/forgot-password")

    await user.type(screen.getByLabelText("Email"), "someone@example.com")
    await user.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(await screen.findByText("Check your email")).toBeInTheDocument()
    expect(lastRequest().route).toBe("POST /api/auth/forgot-password")
    expect(lastRequestBody()).toEqual({ email: "someone@example.com" })
  })

  it("can send it again", async () => {
    respondWith(204)
    respondWith(204)
    const user = openAt("/forgot-password")

    await user.type(screen.getByLabelText("Email"), "someone@example.com")
    await user.click(screen.getByRole("button", { name: "Send reset link" }))
    await user.click(await screen.findByRole("button", { name: "Send it again" }))

    expect(toast.success).toHaveBeenCalledWith("Sent again")
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe("Reset password", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  it("saves the new password with the token from the email, not the session", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(204)
    const user = openAt("/reset-password#access_token=from-email&refresh_token=r&type=recovery")

    await user.type(screen.getByLabelText("New password"), "new-password")
    await user.type(screen.getByLabelText("Repeat new password"), "new-password")
    await user.click(screen.getByRole("button", { name: "Save new password" }))

    expect(await screen.findByText("Welcome back")).toBeInTheDocument()
    expect(lastRequest()).toEqual({ route: "POST /api/auth/reset-password", auth: "Bearer from-email" })
    expect(lastRequestBody()).toEqual({ password: "new-password" })
    expect(useAuthStore.getState().user).toBeNull()
    // The token doesn't stay in the address bar
    expect(window.location.hash).toBe("")
  })

  it("follows a reset link that lands on another page", async () => {
    openAt("/#access_token=from-email&type=recovery")

    expect(await screen.findByText("Choose a new password")).toBeInTheDocument()
  })

  it("explains when the link has expired", async () => {
    openAt("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid")

    expect(await screen.findByText("This link has expired")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Send me a new link" })).toHaveAttribute("href", "/forgot-password")
  })

  it("explains when the link runs out before the password is saved", async () => {
    respondWith(401)
    const user = openAt("/reset-password#access_token=old&type=recovery")

    await user.type(screen.getByLabelText("New password"), "new-password")
    await user.type(screen.getByLabelText("Repeat new password"), "new-password")
    await user.click(screen.getByRole("button", { name: "Save new password" }))

    expect(await screen.findByText("This link has expired")).toBeInTheDocument()
  })

  it("treats the page without a link as expired", () => {
    openAt("/reset-password")

    expect(screen.getByText("This link has expired")).toBeInTheDocument()
  })
})
