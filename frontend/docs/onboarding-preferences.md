# Onboarding preferences

What we ask a user the first time they log in, before they can use the app.
Tenants and landlords get different forms. This expands Step 3 of `project_flow`,
and every field maps to a column in the Supabase schema (shown in the **Column** column).

## Flow

1. User signs up, then logs in.
2. If onboarding isn't finished, they're sent to `/onboarding` instead of the dashboard.
   - Tenant → `/onboarding` (4 steps) → `/houses`
   - Landlord → `/onboarding` (5 steps) → `/landlord`
3. Answers are saved as a draft as they go, so closing the tab doesn't lose anything.
   Photos are the exception: they're only kept in memory until uploads to Supabase storage are wired up.
4. Dashboard routes stay locked until every required step is done (`tenants.onboarding_complete` / `profiles.first_login`).
5. Answers can be edited later from **Profile**.

Every step shows a progress bar (`Step 2 of 4`), a **Back** button and a **Next** button.
**Next** is disabled until the required fields on that step are filled in.

---

## Tenant (4 steps)

### Step 1 — About you → `tenants`

All required. The columns allow nulls, but the roommate card needs every one of these.

| Field | Input | Column |
|---|---|---|
| Profile photo | 1 photo, JPG/PNG, max 5 MB | `photo_url` |
| Age | Number, 16–100 | `age` |
| University or college | Text | `university` |
| Course | Text | `course` |
| Bio | Textarea, max 300 characters | `bio` |

### Step 2 — Accommodation → `tenant_house_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Budget | Range slider + number boxes, €300–€1,500 | numbers | `budget_min`, `budget_max` |
| Preferred areas | Multi-select chips (Cork areas), at least 1 | text array | `preferred_areas` |
| Room type | Single select | `single`, `double`, `ensuite` | `room_type` |
| Move-in date | Date picker, today or later | `YYYY-MM-DD` | `move_in_date` |
| Lease length | Single select | 3, 5, 9, 12 (months) | `lease_months` |
| Most housemates | Single select | 1–5 | `max_housemates` |

### Step 3 — Lifestyle → `tenant_lifestyle_preferences`, `tenant_interests`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Sleep schedule | Single select | `early_bird`, `night_owl` | `sleep_schedule` |
| Noise | Scale 1–5 | 1–5 | `noise_tolerance` |
| Cleanliness | Single select | `very_tidy`, `tidy`, `relaxed` | `cleanliness` |
| Work / study | Single select | `on_campus`, `from_home`, `mixed`, `night_shifts` | `work_schedule` |
| Social style | Single select | `homebody`, `balanced`, `social` | `social_level` |
| Guests | Single select | `rarely`, `weekends`, `often` | `guest_frequency` |
| Do you smoke? | Yes / No | boolean | `smoker` |
| OK living with a smoker? | Yes / No | boolean | `ok_with_smoking` |
| Do you have a pet? | Yes / No | boolean | `has_pets` |
| OK living with pets? | Yes / No | boolean | `ok_with_pets` |
| Interests | Chips + "add your own", at least 1, max 6 | one row each | `tenant_interests.interest` |

### Step 4 — Personality prompts → `tenant_prompt_answers`

Pick **3** prompts and answer each one (max 150 characters). Saved as one row per answer:
`slot` is 1–3 in the order picked, `prompt_id` is the number below. Seed the `prompts` table with these ids.

| prompt_id | text |
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

---

## Landlord (5 steps)

A landlord needs at least one listing before they can use the dashboard, so most of their onboarding is creating that first listing.

### Step 1 — About you → `landlords`, `landlord_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Profile photo | 1 photo, optional | — | `landlords.photo_url` |
| Who would you like to rent to? | Single select, default Anyone | `any`, `student`, `professional` | `preferred_tenants` |
| Shortest lease you'll accept | Single select, default No minimum | 1, 3, 5, 9, 12 (months) | `min_lease_months` |
| Do tenants need references? | Yes / No, default No | boolean | `references_required` |

### Step 2 — Property details → `houses`

| Field | Input | Column |
|---|---|---|
| Listing title | Text, max 60 | `title` |
| Area | Single select (Cork areas) | `area` |
| Address | Text | `address` |
| Rent | Slider + number box, €300–€3,000 | `rent` |
| Rooms available | Slider + number box, 1–10 | `rooms_available` |
| Room type | `single`, `double`, `ensuite` | `room_type` |
| Available from | Date picker | `available_from` |
| Description | Textarea, max 500 | ⚠️ no column yet, see open questions |

### Step 3 — Amenities → `house_amenities`

Chips, at least 1. Each one is a row linking to the `amenities` table by name; `vlm_verified` is filled in later by the VLM pipeline.

WiFi, Bills included, Central heating, Kitchen access, Washing machine, Dryer, Dishwasher,
Study desk, Double bed, En-suite, Garden, Balcony, Parking, Bike storage, Lift

### Step 4 — House rules → `house_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Are pets allowed? | Yes / No | boolean | `pets_allowed` |
| Is smoking allowed? | Yes / No | boolean | `smoking_allowed` |
| Guests | Single select | `no_overnight`, `weekends`, `welcome` | `guest_policy` |
| Quiet hours start | None, 9pm, 10pm, 11pm, Midnight | `HH:MM` or empty | `quiet_hours_start` |
| Quiet hours end | 7am, 8am, 9am (only if a start is picked) | `HH:MM` | `quiet_hours_end` |
| Shortest lease for this house | Single select | 1, 3, 5, 9, 12 | `min_lease_months` |
| Most people living in the house | Slider + number box, 1–12 | number | `max_occupants` |
| Anything else? | Textarea, optional, max 300 | text | `extra_rules` |

### Step 5 — Photos → `house_photos`

- At least 1, up to 6 (JPG or PNG, max 5 MB each). `position` is the order shown; the first is the cover.
- For now photos are only previewed in the browser. Upload and VLM checks happen once the backend is ready.

---

## How it maps to the code

- Answers live in `stores/preferencesStore.ts` (Zustand + `persist`), keyed by user id, with a `completed` flag.
- Field names in `types/index.ts` (`TenantOnboarding`, `LandlordOnboarding`) are the column names in camelCase, grouped by table.
- All enum values and option lists are in `lib/onboardingOptions.ts`.
- Each step is a component plus a Zod schema in `components/onboarding/steps.ts`. **Next** only enables when the schema passes.
- When the backend is ready, the store's save calls get swapped for Supabase inserts (same idea as `houseService.ts`).

## Open questions for the backend team

- **Enum values.** The schema only shows `USER-DEFINED`. The values above (`early_bird`, `ensuite`, `no_overnight`…) are our guess and need checking against the real enums: `room_type`, `sleep_schedule`, `cleanliness`, `work_schedule`, `social_level`, `guest_frequency`, `guest_policy`, `tenant_type`. Fixing one is a single edit in `lib/onboardingOptions.ts`.
- **House description.** `houses` has no `description` column, but the house detail page shows one. Can we add `description text`?
- **Two onboarding flags.** `profiles.first_login` and `tenants.onboarding_complete` look like they mean the same thing. Which one decides whether a user sees onboarding? Landlords only have `first_login`.
- **Phone number.** `profile_contacts.phone` / `phone_visible` are asked at sign-up, not here. OK?
- **Prompts.** Are the 10 prompts fine, or does someone want to write their own?
