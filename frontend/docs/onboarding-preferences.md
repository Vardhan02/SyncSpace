# Onboarding preferences

What we ask a user the first time they log in, before they can use the app.
Tenants and landlords get different forms. This expands Step 3 of `project_flow`.

## Flow

1. User signs up, then logs in.
2. If onboarding isn't finished, they're sent to `/onboarding` instead of the dashboard.
   - Tenant → `/onboarding` (3 steps) → `/houses`
   - Landlord → `/onboarding` (4 steps) → `/landlord`
3. Answers are saved as a draft as they go, so closing the tab doesn't lose anything.
   Landlord photos are the exception: they're only kept in memory until there's a backend to upload to.
4. Dashboard routes stay locked until every required step is done.
5. Answers can be edited later from **Profile**.

Every step shows a progress bar (`Step 2 of 3`), a **Back** button and a **Next** button.
**Next** is disabled until the required fields on that step are filled in.

---

## Tenant (3 steps)

### Step 1 — Accommodation

| Field | Input | Options / rules | Required |
|---|---|---|---|
| Budget | Range slider (min–max) + number boxes | €300 – €1,500 per month, steps of €1 | Yes |
| Preferred areas | Multi-select chips | Bishopstown, Blackrock, College Road, Douglas, Shandon, The Lough, Victoria Cross, Wilton | Yes, at least 1 |
| Room type | Multi-select chips | Single room, Double room, En-suite | Yes, at least 1 |
| Move-in date | Date picker | Today or later | Yes |
| Lease length | Single select | Semester (4–5 months), Academic year (9 months), 12 months, Flexible | Yes |
| Housemates | Single select | 1, 2, 3, 4+ | Yes |

### Step 2 — Lifestyle

| Field | Input | Options | Required |
|---|---|---|---|
| Sleep schedule | Single select | Early bird, Night owl | Yes |
| Cleanliness | Single select | Very tidy, Tidy, Average | Yes |
| Noise tolerance | Single select | I need quiet, Some noise is fine, Doesn't bother me | Yes |
| Work / study pattern | Single select | Mostly on campus, Mostly at home, Mix of both, Night shifts | Yes |
| Social style | Single select | Homebody, In between, Very social | Yes |
| Guests | Single select | Rarely, Weekends, Often | Yes |
| Smoking | Single select | Non-smoker, Smoke outside only, Smoker | Yes |
| Pets | Single select | No pets, I have a pet, Fine with pets | Yes |
| Interests | Multi-select chips + "add your own" | Cooking, Hiking, Gym, Reading, Gaming, Music, Coffee, Board games, Sports, Movies | No, max 6 |

### Step 3 — Personality prompts

Pick **3** prompts from the list below and answer each one (max 150 characters).
These show up on the tenant's roommate card.

| # | Prompt |
|---|---|
| 1 | My ideal Friday night is… |
| 2 | The one house rule I'd never break… |
| 3 | You'll find me in the kitchen making… |
| 4 | My biggest pet peeve in a shared house… |
| 5 | On a lazy Sunday I'm usually… |
| 6 | The best way to win me over is… |
| 7 | I'm studying / working on… |
| 8 | A small thing that makes my day… |
| 9 | My go-to way to sort out a disagreement… |
| 10 | Something I'm weirdly good at… |

> The prompts are a suggestion. `project_flow` still has them as TBD, so the team needs to agree on them.

---

## Landlord (4 steps)

A landlord needs at least one listing before they can use the dashboard, so their onboarding is creating that first listing.

### Step 1 — Property details

| Field | Input | Options / rules | Required |
|---|---|---|---|
| Listing title | Text | Max 60 characters, e.g. "Bright double near UCC" | Yes |
| Area | Single select | Same Cork area list as the tenant form | Yes |
| Address | Text | — | Yes |
| Rent | Slider + number box (€/month) | €300 – €3,000, steps of €1 | Yes |
| Room type | Single select | Single room, Double room, En-suite | Yes |
| Rooms available | Slider + number box | 1 – 10 | Yes |
| Available from | Date picker | Today or later | Yes |
| Description | Textarea | Max 500 characters | Yes |

### Step 2 — Amenities

Checkboxes. Each ticked amenity gets checked against the photos by the VLM pipeline later.

WiFi, Bills included, Central heating, Kitchen access, Washing machine, Dryer, Dishwasher,
Study desk, Double bed, En-suite, Garden, Balcony, Parking, Bike storage, Lift

At least 1 required.

### Step 3 — House rules

| Field | Input | Options | Required |
|---|---|---|---|
| Pets | Single select | No pets, Small pets OK, Pets allowed | Yes |
| Smoking | Single select | No smoking, Smoking outside only | Yes |
| Guests | Single select | No overnight guests, Guests on weekends, Guests welcome | Yes |
| Quiet hours | Single select | No quiet hours, Quiet after 10pm, Quiet after 11pm | Yes |
| Other rules | Textarea | Max 300 characters | No |

### Step 4 — Photos

- Upload at least 1 photo, up to 10 (JPG or PNG, max 5 MB each).
- First photo is the cover photo; the landlord can reorder them.
- For now the photos are only previewed in the browser. Upload and VLM checks happen once the backend is ready.

---

## How it maps to the code

- Answers live in `stores/preferencesStore.ts` (Zustand + `persist`), keyed by user id, with a `completed` flag.
- `RequireAuth` checks `completed` and sends the user to `/onboarding` if it's false.
- Each step is a component plus a Zod schema in `components/onboarding/steps.ts`. **Next** only enables when the schema passes.
- Tenant answers use the same values as `Roommate` in `types/index.ts` (e.g. `sleepSchedule`, `cleanliness`) so the swipe cards can read them directly.
- Landlord answers use the same shape as `House`, so a finished listing can be shown with the existing `HouseCard`.
- When the backend is ready, the store's save calls get swapped for API calls (same idea as `houseService.ts`).

## Open questions for the team

- Are the 10 prompts above fine, or does someone want to write their own?
- Should phone-number visibility (from sign-up) be asked again here, or only in Profile?
- Can tenants skip the prompts step and finish it later, or is it required like the spec says?
- Do landlords need a phone number on the listing, or does contact go through the app only?
