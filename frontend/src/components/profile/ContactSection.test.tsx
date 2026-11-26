import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContactSection } from "@/components/profile/ContactSection"
import { useAuthStore } from "@/stores/authStore"
import { fakeSession, lastRequestBody, respondWith } from "@/test/server"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const savedContact = {
  email: "test@example.com",
  phone: "+353 87 123 4567",
  phoneVisible: false,
  onboardingComplete: true,
}

function renderContact() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ContactSection email="test@example.com" description="" toggleLabel="Show my phone number" />
    </QueryClientProvider>
  )
  return userEvent.setup()
}

function requestAt(index: number) {
  const [url, init] = vi.mocked(fetch).mock.calls[index]
  return `${init?.method ?? "GET"} ${new URL(String(url)).pathname}`
}

describe("ContactSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("loads the phone from the tenant profile", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(200, savedContact)
    renderContact()

    expect(await screen.findByDisplayValue("+353 87 123 4567")).toBeInTheDocument()
    expect(requestAt(0)).toBe("GET /api/tenants/me")
  })

  it("loads a landlord's phone from the landlord profile", async () => {
    useAuthStore.getState().startSession(fakeSession("landlord"))
    respondWith(200, savedContact)
    renderContact()

    await screen.findByDisplayValue("+353 87 123 4567")
    expect(requestAt(0)).toBe("GET /api/landlords/me")
  })

  it("saves a new number when the field loses focus", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(200, savedContact)
    respondWith(200, fakeSession("tenant").user)
    const user = renderContact()

    const field = await screen.findByLabelText("Phone number")
    await user.clear(field)
    await user.type(field, "+353 86 999 0000")
    await user.tab()

    expect(requestAt(1)).toBe("PUT /api/me")
    expect(lastRequestBody()).toEqual({ phone: "+353 86 999 0000" })
    expect(toast.success).toHaveBeenCalledWith("Phone number saved")
  })

  it("puts the saved number back when the new one isn't valid", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(200, savedContact)
    const user = renderContact()

    const field = await screen.findByLabelText("Phone number")
    await user.clear(field)
    await user.type(field, "12")
    await user.tab()

    expect(toast.error).toHaveBeenCalledWith("Enter a valid phone number")
    expect(field).toHaveValue("+353 87 123 4567")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("sends only the visibility when the switch is flipped", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(200, savedContact)
    respondWith(200, fakeSession("tenant").user)
    const user = renderContact()

    await user.click(await screen.findByRole("switch", { name: "Show my phone number" }))

    expect(lastRequestBody()).toEqual({ phoneVisible: true })
    expect(await screen.findByRole("switch", { checked: true })).toBeInTheDocument()
  })

  it("offers to try again when the phone can't be loaded", async () => {
    useAuthStore.getState().startSession(fakeSession("tenant"))
    respondWith(500, { message: "something went wrong" })
    renderContact()

    expect(await screen.findByText("Couldn't load your phone number.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})
