import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationStatus } from "@/components/ApplicationStatus"
import type { House, LandlordContact, MyApplication } from "@/types"

const house = { id: "h-123", landlordId: "landlord-1" } as House

const application: MyApplication = {
  applicationId: 20,
  matchId: 29,
  partnerName: "Vardhan Viswanath",
  houseId: 123,
  houseTitle: "Double rooms in Wilton",
  status: "pending",
  createdAt: "2026-11-27T00:40:00Z",
  decidedAt: null,
}

const contact: LandlordContact = {
  applicationId: 20,
  houseId: 123,
  houseTitle: "Double rooms in Wilton",
  landlordName: "Conor Walsh",
  email: "conor@example.com",
  phone: "+353 87 400 0004",
}

// Answers by address, since both requests can be in flight together
function serve(applications: MyApplication[], contacts: LandlordContact[] = []) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    new Response(JSON.stringify(String(url).endsWith("/applications/mine") ? applications : contacts))
  )
}

function renderStatus() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ApplicationStatus house={house} />
    </QueryClientProvider>
  )
}

function requested(path: string) {
  return vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith(path))
}

describe("ApplicationStatus", () => {
  beforeEach(() => vi.restoreAllMocks())

  it("explains the contact details come after a confirmation", async () => {
    serve([])
    renderStatus()

    expect(await screen.findByText(/shared once they confirm your application/)).toBeInTheDocument()
  })

  it("says the pair applied and is waiting", async () => {
    serve([application])
    renderStatus()

    expect(await screen.findByText(/You and Vardhan applied/)).toBeInTheDocument()
    expect(requested("/landlord-contacts")).toBe(false)
  })

  it("shows the landlord's contact details once confirmed", async () => {
    serve([{ ...application, status: "confirmed" }], [contact])
    renderStatus()

    expect(await screen.findByText("You're in! The landlord confirmed you and Vardhan.")).toBeInTheDocument()
    expect(screen.getByText("Conor Walsh")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "conor@example.com" })).toHaveAttribute("href", "mailto:conor@example.com")
    expect(screen.getByRole("link", { name: "+353 87 400 0004" })).toHaveAttribute("href", "tel:+353874000004")
  })

  it("leaves the phone out when the landlord doesn't share it", async () => {
    serve([{ ...application, status: "confirmed" }], [{ ...contact, phone: null }])
    renderStatus()

    await screen.findByText("Conor Walsh")
    expect(screen.queryByRole("link", { name: /\+353/ })).not.toBeInTheDocument()
  })

  it("says when the landlord went with someone else", async () => {
    serve([{ ...application, status: "ignored" }])
    renderStatus()

    expect(await screen.findByText("The landlord went with someone else for this house.")).toBeInTheDocument()
  })
})
