# Frontend ↔ backend

The frontend can run on **mock data** or talk to the **Spring Boot backend**. One setting picks which.

## Switching it on

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:8080
```

Then restart `npm run dev`. Leave the line out (or delete `.env`) to go back to mock data. Nothing breaks either way.

- Run the frontend on port **5173**. The backend only accepts requests from `http://localhost:5173`.
- The login screen isn't connected yet, so the app needs a backend token by hand. Log in with a mock account, then paste this in the browser console:

```js
const r = await fetch("http://localhost:8080/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "tenant@syncspace.test", password: "password123" }) })
const auth = JSON.parse(localStorage.getItem("syncspace-auth"))
auth.state.token = (await r.json()).accessToken
localStorage.setItem("syncspace-auth", JSON.stringify(auth))
location.reload()
```

Use `landlord@syncspace.test` for the landlord pages. Tokens last about an hour.

## Connected endpoints

| Endpoint | Used for | Code |
|---|---|---|
| `GET /api/roommates` | Swipe deck | `roommateService.fetchRoommates` |
| `GET /api/roommates/{id}` | Roommate profile page | `roommateService.fetchRoommate` |
| `POST /api/swipes` | Swiping left / right | `roommateService.sendSwipe` |
| `GET /api/matches` | Matches list, "Send to a match" list | `matchService.getMatches` |
| `GET /api/matches/{id}/houses` | Houses shared in a chat | `matchService.getSharedHouses` |
| `POST /api/matches/{id}/houses` | Sharing a house with a match | `matchService.shareHouse` |
| `POST /api/matches/{id}/apply` | Apply button in a chat | `matchService.applyToHouse` |
| `GET /api/houses` | Tenant house grid | `houseService.fetchHouses` |
| `GET /api/houses/{id}` | House detail page | `houseService.fetchHouse` |
| `POST` / `DELETE /api/houses/{id}/like` | Heart on a house | `houseService.likeHouse` / `unlikeHouse` |
| `GET /api/listings/{id}/likes` | Like counts on the landlord's listings | `landlordService.fetchLikes` |
| `GET /api/applications` | Landlord's applications list | `applicationService.fetchApplications` |
| `GET /api/applications/{id}` | One application with both profiles | `applicationService.fetchApplication` |
| `POST /api/applications/{id}/confirm` and `/ignore` | Confirm / Ignore buttons | `applicationService.decideApplication` |

All requests go through `src/lib/api.ts`, which adds the backend address and the login token.

## Pages still on mock data

| Page | What's still mock |
|---|---|
| Login, Sign up, Forgot password | All of it (`/api/auth/*` not connected) |
| Onboarding, Profile, Edit profile | Answers are saved in the browser only |
| Account settings | Name, email, password and delete account |
| Landlord: My listings | The listings themselves (like counts are real) |
| Landlord: Add / edit listing | Saving, editing, deleting and photos |
| Landlord: Listing detail | The listing itself (likes and application count are real) |
| Landlord profile | All of it |
| House detail (tenant) | The "you applied / landlord contact" box |
| Matches | Unread count, and the heart on a shared house |
| Applications | The "Confirmed" tab (the backend only returns pending ones) |

Not connected yet: `GET /api/likes` (people who liked you) and `GET /api/listings` (landlord's own listings).


