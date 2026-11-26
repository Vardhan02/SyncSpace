# Frontend tests

What's been tested on the frontend: the automated tests, the checks done by hand against the real backend, and what isn't covered yet.

## Running them

From `frontend/`:

```bash
npm test
```

That starts Vitest in watch mode, so the tests run again whenever a file changes. To run them once and stop, use `npx vitest run`.

There are 64 tests in 13 files. They take a couple of seconds and **don't need the backend running**.

## How they work

- **Vitest** runs the tests, and **Testing Library** renders pages in **jsdom**, a fake browser inside Node. Tests click buttons and type into fields the way a person would, then check what's on screen.
- **No real backend.** Each test answers the frontend's requests itself, using `respondWith()` from `src/test/server.ts`. That way the tests can check exactly what the frontend sends (method, address, body, token) and how it handles each kind of reply, errors included.
- **A request without a prepared answer fails the test**, so a test can never reach a real backend, even one running on the same machine (`src/test/setup.ts`).
- **Every test starts from a clean state:** localStorage is cleared and the logged-in user is reset.

## What's covered

### Accounts

**Sign up** (`pages/SignupPage.test.tsx`)
- A bad phone number is caught before anything is sent.
- A successful sign-up sends name, email, phone, password and role, keeps the session, and opens onboarding.
- The landing page's landlord link signs people up as landlords.
- An email that's already taken shows under the email field.
- If Supabase wants the email confirmed first, people are told to check their email and sent to log in.

**Log in** (`pages/LoginPage.test.tsx`)
- Empty fields show errors without calling the server.
- A wrong password shows the server's message.
- A backend that can't be reached shows a clear message.
- A successful login keeps the session and opens the right home page for tenants and landlords.

**Log out** (`components/LogoutButton.test.tsx`)
- Ends the session on the server and in the browser.
- Still logs out in the browser if the server can't be reached.

**Staying logged in** (`lib/api.test.ts`)
- Every request carries the access token.
- An expired token is renewed and the request retried.
- Several requests that expire together share one renewal.
- If the session can't be renewed, the person is logged out.
- No renewal is tried when nobody is logged in.

**Forgot and reset password** (`pages/ResetPassword.test.tsx`)
- Asking for a reset email sends it and shows "Check your email", with a way to send it again.
- The new password is saved using the token from the email, not the logged-in session. The token is then removed from the address bar and the person logs in again.
- A reset link that lands on any page is sent on to the reset page.
- Expired links, links that run out mid-way and the page opened without a link all say the link has expired.

**Pages only for logged-out people** (`components/GuestOnly.test.tsx`)
- The landing, login and signup pages show to people who aren't logged in.
- Logged-in people are sent to onboarding (if not finished), Houses (tenants) or My Listings (landlords).

### Account settings and profile

**Account settings** (`pages/AccountSettingsPage.test.tsx`)
- The email can't be edited.
- A new name is saved.
- The password is changed. A wrong current password shows next to the field and doesn't log anyone out.
- Deleting the account asks for the password, handles a wrong one, and logs out once it's done.

**Phone number** (`components/profile/ContactSection.test.tsx`)
- The phone is loaded from the tenant or landlord profile, depending on the role.
- A new number is saved when the field loses focus. An invalid one goes back to the saved number without calling the server.
- The visibility switch sends only the visibility.
- A failed load offers to try again.

**Tenant profile** (`pages/TenantProfile.test.tsx`)
- The profile page shows the photo and answers saved on the server.
- Editing a section sends the whole profile with the change, without uploading the photo again.
- A newly picked photo is uploaded.

**Photos kept in memory** (`stores/photoStore.test.ts`)
- They're cleared when someone logs out, so the next person in the same tab doesn't see them.
- They're kept when only the name changes.

### Onboarding

**Tenants** (`pages/OnboardingPage.test.tsx`)
- Finishing saves the answers (exactly the fields the backend expects), uploads the photo and opens the app.
- If a reload lost the photo, people are sent back to add it before anything is sent.
- If the server rejects something, its message shows and nothing is marked as done.

**Landlords** (same file)
- Finishing saves the preferences, profile photo, listing and house photos, in that order.
- Trying again after a failed upload doesn't create the listing twice.
- Finish stays disabled once a reload has lost the house photos.

### Listings

**My Listings and listing detail** (`pages/Listings.test.tsx`)
- My Listings shows the landlord's listings from the server, with cover photo and status.
- The likes pop-up loads the names when it's opened.
- Deleting a listing removes it and reloads the list.
- The detail page shows the photos in order, the house rules and the photo check result.
- Until the photo check has run, it says the photos are being checked.
- A listing that doesn't exist shows "This listing isn't available".

**Add and edit listing** (`pages/EditListingPage.test.tsx`)
- Editing starts from the saved listing and saves the changes.
- Removed photos are deleted before new ones are uploaded, to stay under the 6-photo limit.
- If every old photo is removed, the new ones are uploaded first, since the backend won't delete a listing's last photo.
- A listing with no photos can't be saved.
- Trying again after a failed upload doesn't create the new listing twice.

## Checked by hand against the real backend

Each endpoint was also tried for real as it was connected (26 Nov 2026): the backend running locally against the team's Supabase project, and the app open in a browser. Someone used the page while the network requests and the backend log were checked. Status codes below are what the backend actually answered.

Before anything else, the backend itself was checked: a request with no token got 401, a bad sign-up got 400 with a readable `{ message }`, and the browser's CORS check from `localhost:5173` passed.

| Area | What was done | What came back |
|---|---|---|
| Sign up | New tenant account | `POST /api/auth/signup` 201. The session was saved with a real Supabase user id, `firstLogin: true` and both tokens, and the app opened onboarding |
| | Same email again | 422, shown under the email field |
| Log in | Wrong password, then the right one | 400 with "Wrong email or password", then 200 |
| Log out and staying logged in | The saved access token was broken on purpose, then Log out was clicked | `logout` 401 → `refresh` 200 → `logout` retried 204. The browser ended up logged out on `/login` |
| Account settings | Changed the name | `PUT /api/me` 200, still changed after a reload |
| | Wrong current password, then the right one, then logged in with the new password | `change-password` 400, then 204, then login 200 |
| | Deleted the account, first with a wrong password | `DELETE /api/me` 400, then 204. Logging in with that account no longer worked |
| Phone number | Loaded, changed, flipped the visibility switch, reloaded | `GET /api/tenants/me` 200, `PUT /api/me` 200 for each change, all still there after the reload |
| Tenant onboarding | Went through all steps with a photo and clicked Finish | `PUT /api/tenants/me` 200, then `POST /api/tenants/me/photo` 200. The backend then said `onboardingComplete: true`, and the photo's address loaded from Supabase storage (200). Logging in again skipped onboarding |
| Tenant profile | Reloaded the profile, edited sections, changed the photo | Everything stayed after reloads, and the new photo replaced the old one |
| Landlord onboarding | New landlord with a profile photo and house photos | Preferences, photo, `POST /api/listings` (house 112) and `POST /api/listings/112/photos` 201 all went through. The profile, editing the preferences, and logging in again without onboarding all worked |
| My Listings and detail | Opened both | `GET /api/listings/mine` showed house 112 once, with its cover photo. `GET /api/listings/112` showed all 5 photos, the rules and the photo check |
| Likes and delete | Opened the likes pop-up, deleted a test listing | Names loaded, the listing was removed |
| Add and edit listing | Changed a title, removed a photo, added one, added a whole new listing | All saved and still there after reloads |
| Forgot and reset password | Asked for a reset email and followed the link from a real inbox | The email arrived, the new password was saved, and logging in with it worked |
| Logged-out-only pages | Opened `/`, `/login` and `/signup` while logged in as a landlord | All three went straight to My Listings |

### Bugs these checks found

- **Onboarding came back after every login.** A setting left over from building onboarding reset it on each login, so changing the password and logging back in showed onboarding again. The setting was removed.
- **A deleted account's photo stayed on screen.** Photos picked during onboarding were kept in the open tab even after the account was deleted, so the next account in that tab saw them. They're now cleared whenever the logged-in user changes (and there's a test for it).
- **The profile photo disappeared on reload.** The profile page was still reading the photo from browser memory instead of the server. It now reads from `GET /api/tenants/me`.

Small fixes also came out of looking at the pages, such as the remove button on the round profile photo being cut off by the circle.

## What isn't covered yet

- **Pages still on mock data:** roommates, swipes and matches (Cherian), tenant house browsing, and landlord and tenant applications. Their tests come once they're connected to the backend.
- **Some steps of onboarding:** each step's fields aren't tested one by one. The tests start on the last step with the answers already filled in.
- **The real backend, automatically:** the checks above were done by hand once, when each part was connected. Nothing re-runs them, so a backend change could break something without a test noticing.
- **How pages look:** layout, phone-width screens and styling are checked by eye in the browser, not by tests.

## Adding a test

1. Put it next to the file it tests, named `Something.test.tsx`.
2. Prepare each server answer with `respondWith(status, body)` in the order the requests happen. `fakeSession()` gives a logged-in tenant or landlord.
3. Pages that load data need a `QueryClientProvider`; see `ContactSection.test.tsx` for the usual setup.
4. Run `npm test` and make sure everything passes before committing.
