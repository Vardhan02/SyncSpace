import { vi } from "vitest"

import type { AuthSession, UserRole } from "@/types"

// Stands in for the backend: each call answers the next fetch with this status and body.
export function respondWith(status: number, body?: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status })
  )
}

export function fakeSession(role: UserRole, name = "Test User"): AuthSession {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    user: { id: "4b1d2c3e-0000-4000-8000-000000000001", name, email: "test@example.com", role, firstLogin: true },
  }
}

// The JSON body sent with the last fetch.
export function lastRequestBody() {
  const calls = vi.mocked(fetch).mock.calls
  return JSON.parse(String(calls[calls.length - 1][1]?.body))
}
