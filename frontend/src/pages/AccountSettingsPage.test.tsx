import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AccountSettingsPage } from "@/pages/AccountSettingsPage"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, lastRequestBody, respondWith } from "@/test/server"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderSettings() {
  render(
    <MemoryRouter initialEntries={["/profile/settings"]}>
      <Routes>
        <Route path="/profile/settings" element={<AccountSettingsPage />} />
        <Route path="/" element={<p>Landing page</p>} />
      </Routes>
    </MemoryRouter>
  )
  return userEvent.setup()
}

function lastRequest() {
  const calls = vi.mocked(fetch).mock.calls
  const [url, init] = calls[calls.length - 1]
  return { url: String(url), method: init?.method }
}

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    const { user, accessToken, refreshToken } = fakeSession("tenant")
    useAuthStore.setState({ user, accessToken, refreshToken })
  })

  it("doesn't let the email be edited", () => {
    renderSettings()

    expect(screen.getByLabelText("Email")).toBeDisabled()
    expect(screen.getByText("Your email can't be changed.")).toBeInTheDocument()
  })

  it("saves a new name", async () => {
    respondWith(200, { ...fakeSession("tenant").user, name: "New Name" })
    const user = renderSettings()

    await user.clear(screen.getByLabelText("Full name"))
    await user.type(screen.getByLabelText("Full name"), "New Name")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(toast.success).toHaveBeenCalledWith("Account details saved")
    expect(lastRequest()).toEqual({ url: expect.stringContaining("/api/me"), method: "PUT" })
    expect(lastRequestBody()).toEqual({ name: "New Name" })
    expect(useAuthStore.getState().user?.name).toBe("New Name")
  })

  it("changes the password", async () => {
    respondWith(204)
    const user = renderSettings()

    await user.type(screen.getByLabelText("Current password"), "old-password")
    await user.type(screen.getByLabelText("New password"), "new-password")
    await user.type(screen.getByLabelText("Repeat new password"), "new-password")
    await user.click(screen.getByRole("button", { name: "Change password" }))

    expect(toast.success).toHaveBeenCalledWith("Password changed")
    expect(lastRequestBody()).toEqual({ currentPassword: "old-password", newPassword: "new-password" })
  })

  it("shows a wrong current password next to the field", async () => {
    respondWith(400, { message: "current password is wrong" })
    const user = renderSettings()

    await user.type(screen.getByLabelText("Current password"), "wrong")
    await user.type(screen.getByLabelText("New password"), "new-password")
    await user.type(screen.getByLabelText("Repeat new password"), "new-password")
    await user.click(screen.getByRole("button", { name: "Change password" }))

    expect(await screen.findByText("Your current password is wrong")).toBeInTheDocument()
    // A 400 must not be mistaken for an expired session
    expect(useAuthStore.getState().user).not.toBeNull()
  })

  it("asks for the password before deleting", async () => {
    respondWith(400, { message: "wrong password" })
    const user = renderSettings()

    await user.click(screen.getByRole("button", { name: "Delete my account" }))
    await user.click(screen.getByRole("button", { name: "Delete" }))
    expect(screen.getByText("Enter your password")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Your password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("That password is wrong")).toBeInTheDocument()
    expect(useAuthStore.getState().user).not.toBeNull()
  })

  it("deletes the account and signs out", async () => {
    respondWith(204)
    const user = renderSettings()

    await user.click(screen.getByRole("button", { name: "Delete my account" }))
    await user.type(screen.getByLabelText("Your password"), "password123")
    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(await screen.findByText("Landing page")).toBeInTheDocument()
    expect(lastRequest()).toEqual({ url: expect.stringContaining("/api/me"), method: "DELETE" })
    expect(lastRequestBody()).toEqual({ password: "password123" })
    expect(useAuthStore.getState().user).toBeNull()
    expect(toast.success).toHaveBeenCalledWith("Your account has been deleted")
  })
})
