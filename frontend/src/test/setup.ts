import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom has <dialog> but not these two, and Modal needs them
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}

// Tests answer every request with respondWith(). Anything else fails instead of reaching
// a real backend that happens to be running on this machine.
globalThis.fetch = (input) => Promise.reject(new Error(`No test response for ${String(input)}`))

URL.createObjectURL ??= () => "blob:test"
URL.revokeObjectURL ??= () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
})
