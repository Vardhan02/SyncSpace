import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationsPage } from "@/pages/ApplicationsPage"

const tenant = (id: string, name: string) => ({ id, name, photoUrl: null, email: null, phone: null })

const pending = {
  applicationId: 21,
  status: "pending",
  createdAt: "2026-11-27T01:00:00Z",
  decidedAt: null,
  house: { houseId: 120, title: "Bright double rooms near UCC" },
  tenants: [tenant("a", "Cherian Chirackal Joseph"), tenant("b", "Krishna")],
}

const confirmed = {
  applicationId: 20,
  status: "confirmed",
  createdAt: "2026-11-27T00:53:00Z",
  decidedAt: "2026-11-27T00:54:00Z",
  house: { houseId: 123, title: "Double rooms in Wilton" },
  tenants: [tenant("c", "Vardhan Viswanath"), tenant("d", "Dhruvil Shiroiya")],
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ApplicationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

describe("ApplicationsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      new Response(JSON.stringify(String(url).endsWith("status=confirmed") ? [confirmed] : [pending]))
    )
  })

  it("lists new applications from the pending list", async () => {
    renderPage()

    expect(await screen.findByText("Cherian Chirackal Joseph & Krishna")).toBeInTheDocument()
    expect(screen.queryByText("Vardhan Viswanath & Dhruvil Shiroiya")).not.toBeInTheDocument()
  })

  it("lists confirmed applications on the Confirmed tab", async () => {
    const user = renderPage()

    await user.click(await screen.findByRole("button", { name: "Confirmed 1" }))

    expect(screen.getByText("Vardhan Viswanath & Dhruvil Shiroiya")).toBeInTheDocument()
    expect(screen.queryByText("Cherian Chirackal Joseph & Krishna")).not.toBeInTheDocument()
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url)).search)
    expect(urls.toSorted()).toEqual(["?status=confirmed", "?status=pending"])
  })
})
