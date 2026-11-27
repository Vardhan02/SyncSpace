import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LogoutButton } from "@/components/LogoutButton"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, respondWith } from "@/test/server"

async function logOut() {
  render(
    <MemoryRouter initialEntries={["/houses"]}>
      <Routes>
        <Route path="/houses" element={<LogoutButton />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Log out" }))
  // The second "Log out" is the one inside the confirm dialog
  await user.click(screen.getAllByRole("button", { name: "Log out" })[1])
}

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const { user, accessToken, refreshToken } = fakeSession("tenant")
    useAuthStore.setState({ user, accessToken, refreshToken })
  })

  it("ends the session on the server and here", async () => {
    respondWith(204)
    await logOut()

    expect(await screen.findByText("Login page")).toBeInTheDocument()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain("/api/auth/logout")
    expect(init?.method).toBe("POST")
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it("still logs out when the server can't be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await logOut()

    expect(await screen.findByText("Login page")).toBeInTheDocument()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
