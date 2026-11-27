import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, respondWith } from "@/test/server"

function signIn() {
  useAuthStore.setState({
    user: fakeSession("tenant").user,
    accessToken: "old-token",
    refreshToken: "refresh-token",
  })
}

function authHeader(call: number) {
  const init = vi.mocked(fetch).mock.calls[call][1]
  return (init?.headers as Record<string, string>).Authorization
}

describe("api", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    signIn()
  })

  it("sends the access token", async () => {
    respondWith(200, { ok: true })
    await api("/me")

    expect(authHeader(0)).toBe("Bearer old-token")
  })

  it("gets a new token when the old one has expired, then retries", async () => {
    respondWith(401, { message: "unauthorized" })
    respondWith(200, { ...fakeSession("tenant"), accessToken: "new-token", refreshToken: "new-refresh" })
    respondWith(200, { name: "Test User" })

    await expect(api("/me")).resolves.toEqual({ name: "Test User" })
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("/api/auth/refresh")
    expect(authHeader(2)).toBe("Bearer new-token")
    expect(useAuthStore.getState().refreshToken).toBe("new-refresh")
  })

  it("refreshes once when several requests expire together", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/auth/refresh")) {
        return new Response(JSON.stringify({ ...fakeSession("tenant"), accessToken: "new-token" }))
      }
      const token = (init?.headers as Record<string, string>).Authorization
      return token === "Bearer new-token" ? new Response("{}") : new Response(null, { status: 401 })
    })

    await Promise.all([api("/me"), api("/tenants/me")])

    const refreshes = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))
    expect(refreshes).toHaveLength(1)
  })

  it("logs out when the session can't be renewed", async () => {
    respondWith(401, { message: "unauthorized" })
    respondWith(401, { message: "session expired, log in again" })

    await expect(api("/me")).rejects.toThrow("Your session has expired. Log in again.")
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it("doesn't try to refresh when nobody is logged in", async () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    respondWith(401, { message: "unauthorized" })

    await expect(api("/me")).rejects.toThrow("Unauthorized")
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
