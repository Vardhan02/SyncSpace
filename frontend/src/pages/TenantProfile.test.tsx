import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProfileEditPage } from "@/pages/ProfileEditPage"
import { TenantProfilePage } from "@/pages/TenantProfilePage"
import { useAuthStore } from "@/stores/authStore"
import { usePhotoStore } from "@/stores/photoStore"
import { fakeSession, respondWith } from "@/test/server"
import type { MyTenantProfile } from "@/types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const profile: MyTenantProfile = {
  email: "test@example.com",
  phone: "+353 87 123 4567",
  phoneVisible: false,
  onboardingComplete: true,
  id: "4b1d2c3e-0000-4000-8000-000000000001",
  name: "Test User",
  age: 22,
  photoUrl: "https://example.com/me.jpg",
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
    { promptId: 1, text: "My ideal Friday night is…", answer: "Pizza and a film" },
    { promptId: 2, text: "The one house rule I'd never break…", answer: "Clean up after cooking" },
    { promptId: 3, text: "You'll find me in the kitchen making…", answer: "Pancakes" },
  ],
  matchScore: null,
}

function renderAt(path: string) {
  useAuthStore.getState().startSession(fakeSession("tenant"))
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/profile" element={<TenantProfilePage />} />
          <Route path="/profile/edit/:step" element={<ProfileEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

function routes() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`)
}

describe("tenant profile", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    usePhotoStore.setState({ groups: {} })
  })

  it("shows the saved photo and answers from the server", async () => {
    respondWith(200, profile)
    renderAt("/profile")

    expect(await screen.findByRole("img", { name: "Test User" })).toHaveAttribute("src", profile.photoUrl)
    expect(screen.getByText("Computer Science · UCC")).toBeInTheDocument()
    expect(screen.getByText("My ideal Friday night is…")).toBeInTheDocument()
  })

  it("saves a section with the rest of the profile, without uploading the photo again", async () => {
    respondWith(200, profile)
    respondWith(200, profile)
    respondWith(200, profile)
    const user = renderAt("/profile/edit/0")

    await user.click(await screen.findByRole("button", { name: "Save" }))

    await vi.waitFor(() => expect(routes()).toContain("PUT /api/tenants/me"))
    const put = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PUT")
    const body = JSON.parse(String(put?.[1]?.body))
    expect(body.prompts).toEqual([
      { promptId: 1, answer: "Pizza and a film" },
      { promptId: 2, answer: "Clean up after cooking" },
      { promptId: 3, answer: "Pancakes" },
    ])
    expect(body).not.toHaveProperty("photoUrl")
    expect(body).not.toHaveProperty("email")
    expect(routes()).not.toContain("POST /api/tenants/me/photo")
  })

  it("uploads a newly picked photo", async () => {
    respondWith(200, profile)
    respondWith(200, profile)
    respondWith(200, { photoUrl: "https://example.com/new.jpg" })
    respondWith(200, profile)
    const user = renderAt("/profile/edit/0")

    await user.click(await screen.findByRole("button", { name: "Remove Your photo" }))
    const file = new File(["new"], "new.jpg", { type: "image/jpeg" })
    await user.upload(screen.getByLabelText("Add photo"), file)
    await user.click(screen.getByRole("button", { name: "Save" }))

    await vi.waitFor(() => expect(routes()).toContain("POST /api/tenants/me/photo"))
    expect(usePhotoStore.getState().groups["tenant-profile"]).toEqual([])
  })
})
