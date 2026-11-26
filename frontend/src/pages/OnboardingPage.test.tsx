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
import type { TenantOnboarding } from "@/types"

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
