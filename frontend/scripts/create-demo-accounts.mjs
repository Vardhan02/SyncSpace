// Creates demo tenants and landlords through the backend, the same way the app does it:
// sign up, onboarding answers, profile photo, and for landlords a listing with photos.
//
//   node scripts/create-demo-accounts.mjs
//
// Reads scripts/demo-data/accounts.json (names, emails, answers) and the photos next to it.
// Safe to run again: an account that already exists is logged into and only what's
// missing gets added. API_URL changes the backend address (default http://localhost:8080).

import { readFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const API_URL = process.env.API_URL ?? "http://localhost:8080"
const dataDir = join(dirname(fileURLToPath(import.meta.url)), "demo-data")
const accounts = JSON.parse(await readFile(join(dataDir, "accounts.json"), "utf8"))

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function call(path, { method = "GET", body, token } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json"

  // Supabase limits how fast accounts can be made, so wait and try again a couple of times
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body && JSON.stringify(body),
    })
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    if (response.ok) return data

    const message = data?.message ?? `HTTP ${response.status}`
    if (message.includes("too many attempts") && attempt < 4) {
      console.log(`   rate limited, waiting ${attempt * 20}s`)
      await new Promise((resolve) => setTimeout(resolve, attempt * 20_000))
      continue
    }
    throw new ApiError(response.status, `${method} ${path}: ${message}`)
  }
}

async function photoForm(field, paths) {
  const form = new FormData()
  for (const path of paths) {
    const bytes = await readFile(join(dataDir, path))
    form.append(field, new Blob([bytes], { type: "image/jpeg" }), basename(path))
  }
  return form
}

// Signs up, or logs in when the account is already there from an earlier run
async function startSession(person, role, password) {
  try {
    const session = await call("/auth/signup", {
      method: "POST",
      body: { name: person.name, email: person.email, phone: person.phone, password, role, phoneVisible: true },
    })
    if (!session?.accessToken) throw new Error("Supabase wants the email confirmed first, so this account can't be finished here")
    console.log("   signed up")
    return session.accessToken
  } catch (error) {
    if (error.status !== 422) throw error
  }
  try {
    const session = await call("/auth/login", { method: "POST", body: { email: person.email, password } })
    console.log("   already existed, logged in")
    return session.accessToken
  } catch {
    throw new Error("an account with this email already exists with a different password. Delete it first, then run this again")
  }
}

async function createTenant(person) {
  const token = await startSession(person, "tenant", accounts.passwords.tenant)
  const profile = await call("/tenants/me", { token })
  if (profile.onboardingComplete) {
    console.log("   onboarding already done")
    return
  }
  await call("/tenants/me", { method: "PUT", body: person.answers, token })
  console.log("   onboarding answers saved")
  // Onboarding finishes once both the answers and the photo are in
  await call("/tenants/me/photo", { method: "POST", body: await photoForm("file", [person.photo]), token })
  console.log("   profile photo uploaded")
}

async function createLandlord(person) {
  const token = await startSession(person, "landlord", accounts.passwords.landlord)
  const profile = await call("/landlords/me", { token })
  if (!profile.preferredTenants) {
    await call("/landlords/me/preferences", { method: "PUT", body: person.preferences, token })
    console.log("   preferences saved")
  }
  if (!profile.photoUrl) {
    await call("/landlords/me/photo", { method: "POST", body: await photoForm("file", [person.photo]), token })
    console.log("   profile photo uploaded")
  }

  const listings = await call("/listings/mine", { token })
  let houseId = listings.find((listing) => listing.title === person.listing.title)?.houseId
  if (!houseId) {
    houseId = (await call("/listings", { method: "POST", body: person.listing, token })).houseId
    console.log(`   listing created (house ${houseId})`)
  }
  const listing = await call(`/listings/${houseId}`, { token })
  if (listing.photos.length === 0) {
    await call(`/listings/${houseId}/photos`, { method: "POST", body: await photoForm("files", person.housePhotos), token })
    console.log(`   ${person.housePhotos.length} house photos uploaded`)
  }
}

// Landlords first: a tenant's houses are ranked when they finish onboarding, so the listings
// need to exist by then
let failed = 0
for (const [role, people, create] of [
  ["landlord", accounts.landlords, createLandlord],
  ["tenant", accounts.tenants, createTenant],
]) {
  for (const person of people) {
    console.log(`${role}: ${person.name} <${person.email}>`)
    try {
      await create(person)
    } catch (error) {
      failed++
      console.log(`   FAILED: ${error.message}`)
    }
  }
}

console.log(failed ? `\nDone, ${failed} account(s) failed (see above).` : "\nDone, every account is ready.")
process.exitCode = failed ? 1 : 0
