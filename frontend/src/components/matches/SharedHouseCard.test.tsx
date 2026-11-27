import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { SharedHouseCard } from "@/components/matches/SharedHouseCard"
import type { SharedHouse } from "@/types"

const shared: SharedHouse = {
  house: { id: "h-123", title: "Double rooms in Wilton", area: "Wilton", rent: 680 },
  fromMe: true,
  sentAt: "2026-11-27T10:00:00Z",
  iApplied: false,
  theyApplied: false,
  applicationStatus: null,
}

function renderCard(changes: Partial<SharedHouse>, applied = false) {
  // The photo grid loads the house's photos; nothing to answer here, the card shows placeholders
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }))
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <SharedHouseCard
          shared={{ ...shared, ...changes }}
          name="Vardhan"
          liked={false}
          onLike={() => {}}
          applied={applied}
          onApply={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("SharedHouseCard", () => {
  it("offers to apply when nobody has", () => {
    renderCard({})
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled()
  })

  it("says when the match has already applied", () => {
    renderCard({ theyApplied: true })
    expect(screen.getByRole("button", { name: "Apply too, Vardhan applied" })).toBeEnabled()
  })

  it("says it's waiting for the match after applying alone", () => {
    renderCard({ iApplied: true }, true)
    expect(screen.getByRole("button", { name: "Applied" })).toBeDisabled()
    expect(screen.getByText("Waiting for Vardhan to apply. The landlord sees it once you both have.")).toBeInTheDocument()
  })

  it("says it went to the landlord once both applied", () => {
    renderCard({ iApplied: true, theyApplied: true, applicationStatus: "pending" }, true)
    expect(screen.getByRole("button", { name: "Sent to the landlord" })).toBeDisabled()
    expect(screen.getByText("Waiting for the landlord to decide.")).toBeInTheDocument()
  })

  it("shows the landlord's answer", () => {
    renderCard({ iApplied: true, theyApplied: true, applicationStatus: "confirmed" }, true)
    expect(screen.getByText("The landlord said yes! Their contact details are on the house page.")).toBeInTheDocument()
  })

  it("says when the landlord went with someone else", () => {
    renderCard({ iApplied: true, theyApplied: true, applicationStatus: "ignored" }, true)
    expect(screen.getByRole("button", { name: "Not this time" })).toBeDisabled()
    expect(screen.getByText("The landlord went with someone else.")).toBeInTheDocument()
  })
})
