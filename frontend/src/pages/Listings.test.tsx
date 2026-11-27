import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ListingDetailPage } from "@/pages/ListingDetailPage"
import { MyListingsPage } from "@/pages/MyListingsPage"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, respondWith } from "@/test/server"
import type { ListingDetail, ListingSummary } from "@/types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const summary: ListingSummary = {
  houseId: 112,
  title: "Bright room near UCC",
  address: "12 College Road, Cork",
  area: "College Road",
  rent: 750,
  status: "draft",
  verified: false,
  verificationStatus: "pending",
  verificationNote: null,
  coverPhoto: "https://example.com/cover.jpg",
  likeCount: 2,
}

const detail: ListingDetail = {
  houseId: 112,
  title: "Bright room near UCC",
  area: "College Road",
  address: "12 College Road, Cork",
  rent: 750,
  roomType: "double",
  availableFrom: "2027-01-01",
  roomsAvailable: 2,
  description: "Five minutes from campus.",
  status: "active",
  verified: false,
  verificationStatus: "failed",
  verificationNote: "The photos don't show a dryer.",
  createdAt: "2026-11-26T20:00:00Z",
  petsAllowed: false,
  smokingAllowed: false,
  guestPolicy: "weekends",
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
  minLeaseMonths: 9,
  maxOccupants: 4,
  extraRules: null,
  amenities: [
    { name: "WiFi", vlmVerified: true },
    { name: "Dryer", vlmVerified: false },
  ],
  photos: [
    { photoId: 2, url: "https://example.com/second.jpg", position: 1 },
    { photoId: 1, url: "https://example.com/first.jpg", position: 0 },
  ],
  likeCount: 2,
}

function renderAt(path: string) {
  useAuthStore.getState().startSession(fakeSession("landlord"))
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/landlord/listings" element={<MyListingsPage />} />
          <Route path="/landlord/listings/:houseId" element={<ListingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

function routes() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`)
}

describe("My listings", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("shows the landlord's listings from the server with their cover photo", async () => {
    respondWith(200, [summary])
    renderAt("/landlord/listings")

    const card = (await screen.findByRole("heading", { name: "Bright room near UCC" })).closest("article")!
    expect(within(card).getByText("Draft")).toBeInTheDocument()
    expect(card.querySelector("img")).toHaveAttribute("src", summary.coverPhoto)
    expect(screen.getByText(/1 listing · 2 likes/)).toBeInTheDocument()
  })

  it("loads the names when the likes are opened", async () => {
    respondWith(200, [summary])
    respondWith(200, { count: 2, names: ["Aanya Kapoor", "Liam Byrne"] })
    const user = renderAt("/landlord/listings")

    await user.click(await screen.findByRole("button", { name: "2 likes" }))

    expect(await screen.findByText("Liam Byrne")).toBeInTheDocument()
    expect(routes()).toContain("GET /api/listings/112/likes")
  })

  it("deletes a listing and reloads the list", async () => {
    respondWith(200, [summary])
    respondWith(204)
    respondWith(200, [])
    const user = renderAt("/landlord/listings")

    await user.click(await screen.findByRole("button", { name: "Delete" }))
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!)

    expect(await screen.findByText("No listings yet")).toBeInTheDocument()
    expect(routes()).toContain("DELETE /api/listings/112")
  })
})

describe("Listing detail", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("shows the photos in order, the rules and the photo check", async () => {
    // The page also loads the landlord's applications for its count, at the same time
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      new Response(JSON.stringify(String(url).includes("/applications") ? [] : detail))
    )
    renderAt("/landlord/listings/112")

    const photos = await screen.findAllByRole("img", { name: /Bright room near UCC, photo/ })
    expect(photos.map((photo) => photo.getAttribute("src"))).toEqual([
      "https://example.com/first.jpg",
      "https://example.com/second.jpg",
    ])
    expect(screen.getByText("Double room")).toBeInTheDocument()
    expect(screen.getByText("Quiet from 11pm to 7am")).toBeInTheDocument()
    expect(screen.getByText("Up to 4 people in the house")).toBeInTheDocument()
    expect(screen.getByText("Photo check failed")).toBeInTheDocument()
    expect(screen.getByText("The photos don't show a dryer.")).toBeInTheDocument()
    expect(screen.getByText(/not seen in your photos/)).toBeInTheDocument()
    expect(routes().toSorted()).toEqual(["GET /api/applications", "GET /api/listings/112"])
  })

  it("says the photos are being checked until the check has run", async () => {
    const pending = {
      ...detail,
      verificationStatus: "pending",
      verificationNote: null,
      amenities: detail.amenities.map((a) => ({ ...a, vlmVerified: null })),
    }
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      new Response(JSON.stringify(String(url).includes("/applications") ? [] : pending))
    )
    renderAt("/landlord/listings/112")

    expect(await screen.findByText(/We're checking your photos/)).toBeInTheDocument()
  })

  it("says so when the listing doesn't exist", async () => {
    respondWith(404, { message: "listing not found" })
    renderAt("/landlord/listings/999")

    expect(await screen.findByText("This listing isn't available")).toBeInTheDocument()
  })
})
