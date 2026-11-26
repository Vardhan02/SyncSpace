import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSaveListing } from "@/hooks/useListings"
import { landlordDefaults } from "@/lib/onboardingOptions"
import { EditListingPage } from "@/pages/EditListingPage"
import { formFromListing } from "@/services/listingService"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, respondWith } from "@/test/server"
import type { LandlordOnboarding, ListingDetail } from "@/types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const listing: ListingDetail = {
  houseId: 112,
  title: "Bright room near UCC",
  area: "College Road",
  address: "12 College Road, Cork",
  rent: 750,
  roomType: "double",
  availableFrom: "2099-01-01",
  roomsAvailable: 2,
  description: "Five minutes from campus.",
  status: "active",
  verified: false,
  createdAt: "2026-11-26T20:00:00Z",
  petsAllowed: false,
  smokingAllowed: false,
  guestPolicy: "weekends",
  quietHoursStart: null,
  quietHoursEnd: null,
  minLeaseMonths: 9,
  maxOccupants: 4,
  extraRules: null,
  amenities: [{ name: "WiFi", vlmVerified: null }],
  photos: [
    { photoId: 1, url: "https://example.com/1.jpg", position: 0 },
    { photoId: 2, url: "https://example.com/2.jpg", position: 1 },
  ],
  likeCount: 0,
}

const newPhoto = new File(["new"], "new.jpg", { type: "image/jpeg" })

function renderAt(path: string) {
  useAuthStore.getState().startSession(fakeSession("landlord"))
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/landlord/listings/new" element={<EditListingPage />} />
          <Route path="/landlord/listings/:houseId/edit" element={<EditListingPage />} />
          <Route path="/landlord/listings/:houseId" element={<p>Listing page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

// Every request except the GETs that reload data
function changes() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => init?.method && init.method !== "GET")
    .map(([url, init]) => `${init?.method} ${new URL(String(url)).pathname}`)
}

describe("Edit listing", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("starts from the saved listing and saves the changes", async () => {
    respondWith(200, listing)
    respondWith(200, listing)
    respondWith(200, listing)
    const user = renderAt("/landlord/listings/112/edit")

    const title = await screen.findByLabelText(/title/i)
    expect(title).toHaveValue("Bright room near UCC")
    await user.clear(title)
    await user.type(title, "Sunny room near UCC")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Listing page")).toBeInTheDocument()
    expect(changes()).toEqual(["PUT /api/listings/112"])
    const put = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PUT")
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({ title: "Sunny room near UCC", minLeaseMonths: 9 })
  })

  it("removes a photo before uploading new ones", async () => {
    respondWith(200, listing)
    respondWith(200, listing)
    respondWith(204)
    respondWith(201, [])
    respondWith(200, listing)
    const user = renderAt("/landlord/listings/112/edit")

    await user.click(await screen.findByRole("button", { name: "Remove photo 2" }))
    await user.upload(screen.getByLabelText("Add photos"), newPhoto)
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await screen.findByText("Listing page")
    expect(changes()).toEqual(["PUT /api/listings/112", "DELETE /api/listings/112/photos/2", "POST /api/listings/112/photos"])
  })

  it("uploads first when every old photo is removed, since the last one can't be deleted", async () => {
    respondWith(200, listing)
    respondWith(200, listing)
    respondWith(201, [])
    respondWith(204)
    respondWith(204)
    respondWith(200, listing)
    const user = renderAt("/landlord/listings/112/edit")

    await user.click(await screen.findByRole("button", { name: "Remove photo 1" }))
    await user.click(screen.getByRole("button", { name: "Remove photo 1" }))
    await user.upload(screen.getByLabelText("Add photos"), newPhoto)
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await screen.findByText("Listing page")
    expect(changes()).toEqual([
      "PUT /api/listings/112",
      "POST /api/listings/112/photos",
      "DELETE /api/listings/112/photos/1",
      "DELETE /api/listings/112/photos/2",
    ])
  })

  it("won't save a listing with no photos", async () => {
    respondWith(200, listing)
    const user = renderAt("/landlord/listings/112/edit")

    await user.click(await screen.findByRole("button", { name: "Remove photo 1" }))
    await user.click(screen.getByRole("button", { name: "Remove photo 1" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(toast.error).toHaveBeenCalledWith("Check add some photos")
    expect(changes()).toEqual([])
  })
})

describe("Saving a new listing", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("doesn't create it twice when trying again after a failed upload", async () => {
    respondWith(201, { ...listing, houseId: 113 })
    respondWith(500, { message: "something went wrong" })
    respondWith(200, listing)
    respondWith(201, [])
    const client = new QueryClient()
    const { result } = renderHook(() => useSaveListing(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    let createdId: number | undefined
    const save = () =>
      result.current.mutateAsync({
        houseId: createdId,
        values: { ...landlordDefaults, ...formFromListing(listing) } as LandlordOnboarding,
        removePhotoIds: [],
        newPhotos: [newPhoto],
        keptPhotos: 0,
        onCreated: (id) => (createdId = id),
      })

    await expect(save()).rejects.toThrow("Something went wrong")
    expect(createdId).toBe(113)
    await expect(save()).resolves.toBe(113)

    expect(changes()).toEqual([
      "POST /api/listings",
      "POST /api/listings/113/photos",
      "PUT /api/listings/113",
      "POST /api/listings/113/photos",
    ])
  })
})
