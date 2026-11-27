import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OnboardingPage } from "@/pages/OnboardingPage"
import { useAuthStore } from "@/stores/authStore"
import { usePhotoStore } from "@/stores/photoStore"
import { emptyRecord, usePreferencesStore } from "@/stores/preferencesStore"
import { fakeSession, respondWith } from "@/test/server"
import type { LandlordOnboarding, TenantOnboarding } from "@/types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const answers: TenantOnboarding = {
  photoCount: 1,
  age: 22,
  university: "UCC",
  course: "Computer Science",
  bio: "Early riser, likes cooking.",
  budgetMin: 500,
  budgetMax: 900,
  preferredAreas: ["Douglas"],
  roomType: "single",
  moveInDate: "2027-01-15",
  leaseMonths: 9,
  maxHousemates: 3,
  sleepSchedule: "early_bird",
  noiseTolerance: 2,
  cleanliness: "tidy",
  workSchedule: "on_campus",
  socialLevel: "balanced",
  guestFrequency: "weekends",
  smoker: false,
  okWithSmoking: false,
  hasPets: false,
  okWithPets: true,
  interests: ["Cooking"],
  prompts: [
    { promptId: 1, answer: "Pizza and a film" },
    { promptId: 2, answer: "Clean up after cooking" },
    { promptId: 3, answer: "Pancakes" },
  ],
}

const photoFile = new File(["photo"], "me.jpg", { type: "image/jpeg" })

function renderOnLastStep({ withPhoto = true } = {}) {
  const session = fakeSession("tenant")
  useAuthStore.getState().startSession(session)
  // After logging in, since a new user clears the photos
  usePhotoStore.setState({
    groups: withPhoto ? { "tenant-profile": [{ id: "p-1", url: "blob:me", name: "me.jpg", file: photoFile }] } : {},
  })
  usePreferencesStore.setState({
    records: { [session.user.id]: { ...emptyRecord, step: 3, tenant: answers } },
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/houses" element={<p>Houses</p>} />
          <Route path="/landlord" element={<p>Landlord home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

function call(index: number) {
  const [url, init] = vi.mocked(fetch).mock.calls[index]
  return { route: `${init?.method} ${new URL(String(url)).pathname}`, body: init?.body }
}

describe("OnboardingPage, tenant", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  it("saves the answers, uploads the photo and opens the app", async () => {
    respondWith(200, {})
    respondWith(200, { photoUrl: "https://example.com/me.jpg" })
    const user = renderOnLastStep()

    await user.click(screen.getByRole("button", { name: "Finish" }))

    expect(await screen.findByText("Houses")).toBeInTheDocument()
    const { photoCount: _photoCount, ...sent } = answers
    expect(call(0).route).toBe("PUT /api/tenants/me")
    expect(JSON.parse(String(call(0).body))).toEqual(sent)
    expect(call(1).route).toBe("POST /api/tenants/me/photo")
    expect((call(1).body as FormData).get("file")).toBe(photoFile)
    expect(useAuthStore.getState().user?.firstLogin).toBe(false)
  })

  it("asks for the photo again when it was lost on a reload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const user = renderOnLastStep({ withPhoto: false })

    await user.click(screen.getByRole("button", { name: "Finish" }))

    expect(toast.error).toHaveBeenCalledWith("Add your profile photo again")
    expect(await screen.findByText("Step 1 of 4")).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("stays on the step when the server says no", async () => {
    respondWith(400, { message: "moveInDate: can't be in the past" })
    const user = renderOnLastStep()

    await user.click(screen.getByRole("button", { name: "Finish" }))

    expect(toast.error).toHaveBeenCalledWith("Can't be in the past")
    expect(screen.getByRole("button", { name: "Finish" })).toBeEnabled()
    expect(useAuthStore.getState().user?.firstLogin).toBe(true)
  })
})

const listing: LandlordOnboarding = {
  photoCount: 1,
  preferredTenants: "student",
  minLeaseMonths: 9,
  referencesRequired: true,
  title: "Bright room near UCC",
  area: "College Road",
  address: "12 College Road, Cork",
  rent: 750,
  roomType: "double",
  availableFrom: "2027-01-01",
  roomsAvailable: 2,
  description: "Five minutes from campus.",
  amenities: ["WiFi", "Dryer"],
  petsAllowed: false,
  smokingAllowed: false,
  guestPolicy: "weekends",
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
  houseMinLeaseMonths: 9,
  maxOccupants: 4,
  extraRules: "",
  housePhotoCount: 2,
}

const houseFiles = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })]
const landlordFile = new File(["me"], "me.jpg", { type: "image/jpeg" })

function renderLandlordOnLastStep({ withHousePhotos = true } = {}) {
  const session = fakeSession("landlord")
  useAuthStore.getState().startSession(session)
  usePhotoStore.setState({
    groups: {
      "landlord-profile": [{ id: "me", url: "blob:me", name: "me.jpg", file: landlordFile }],
      house: withHousePhotos ? houseFiles.map((file) => ({ id: file.name, url: `blob:${file.name}`, name: file.name, file })) : [],
    },
  })
  usePreferencesStore.setState({
    records: { [session.user.id]: { ...emptyRecord, step: 4, landlord: listing } },
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/landlord" element={<p>Landlord home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

describe("OnboardingPage, landlord", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  it("saves the preferences, photo, listing and house photos in order", async () => {
    respondWith(200, {})
    respondWith(200, { photoUrl: "https://example.com/me.jpg" })
    respondWith(201, { houseId: 42 })
    respondWith(200, [])
    const user = renderLandlordOnLastStep()

    await user.click(screen.getByRole("button", { name: "Finish" }))

    expect(await screen.findByText("Landlord home")).toBeInTheDocument()
    expect([0, 1, 2, 3].map((i) => call(i).route)).toEqual([
      "PUT /api/landlords/me/preferences",
      "POST /api/landlords/me/photo",
      "POST /api/listings",
      "POST /api/listings/42/photos",
    ])
    expect(JSON.parse(String(call(0).body))).toEqual({
      preferredTenants: "student",
      minLeaseMonths: 9,
      referencesRequired: true,
    })
    const sentListing = JSON.parse(String(call(2).body))
    expect(sentListing).toMatchObject({ title: "Bright room near UCC", minLeaseMonths: 9, extraRules: null })
    expect(sentListing).not.toHaveProperty("housePhotoCount")
    expect((call(3).body as FormData).getAll("files")).toEqual(houseFiles)
    expect(useAuthStore.getState().user?.firstLogin).toBe(false)
  })

  it("doesn't create the listing twice when trying again after a failed upload", async () => {
    respondWith(200, {})
    respondWith(200, { photoUrl: "https://example.com/me.jpg" })
    respondWith(201, { houseId: 42 })
    respondWith(500, { message: "something went wrong" })
    respondWith(200, {})
    respondWith(200, [])
    const user = renderLandlordOnLastStep()

    await user.click(screen.getByRole("button", { name: "Finish" }))
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"))
    await user.click(screen.getByRole("button", { name: "Finish" }))

    expect(await screen.findByText("Landlord home")).toBeInTheDocument()
    const creates = vi.mocked(fetch).mock.calls.filter(
      ([url, init]) => init?.method === "POST" && new URL(String(url)).pathname === "/api/listings"
    )
    expect(creates).toHaveLength(1)
  })

  it("can't finish once a reload has lost the house photos", () => {
    renderLandlordOnLastStep({ withHousePhotos: false })

    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled()
  })
})
