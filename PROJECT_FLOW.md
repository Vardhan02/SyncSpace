# SyncSpace: project flow

The single reference for the whole team: what the app does, how each part works, which area owns what, and what is still undecided. It replaces `README.md`, `frontend/README.md`, `frontend/docs/onboarding-preferences.md`, `part-b-houses_updated.md` and `api-endpoints.md`. Corrections are made here, so this file stays the source of truth.

**Contents**
1. What SyncSpace is
2. The user flow, end to end
3. Areas, branches and stack
4. Getting set up
5. Database
6. Onboarding forms
7. Photo storage
8. How the backend works
9. API endpoints: the split
10. API endpoint details
11. Frontend details
12. Testing and pushing
13. Open questions and to-dos

---

## 1. What SyncSpace is

A roommate matcher for Cork. Tenants swipe on other tenants based on lifestyle and personality. When two tenants both swipe right they become a match. A match can share house listings with each other, and when both tenants click Apply on the same house, a joint application goes to the landlord. The landlord sees both tenants' profiles and confirms or ignores the application. Only after a confirm do the tenants get the landlord's contact details.

Landlords list houses with photos, amenities and house rules. A VLM pipeline checks the photos against the claimed amenities and marks listings as verified. A ranking job scores houses and roommates for each tenant, so the best matches show first.

---

## 2. The user flow, end to end

### 2.1 Sign up and log in
1. The user signs up with name, email, phone, password, role (`tenant` or `landlord`) and whether their phone is visible to matches.
2. A database trigger (`on_auth_user_created`) creates their `profiles` row (name, role, `first_login = true`) and their `profile_contacts` row (phone, `phone_visible`).
3. The user logs in and gets an access token (valid one hour) and a refresh token.

### 2.2 Onboarding (first login)
If onboarding isn't finished, the user is sent to `/onboarding` instead of the dashboard.
- **Tenant:** 4 steps (about you, accommodation, lifestyle, personality prompts), then `/houses`.
- **Landlord:** 5 steps (about you, property details, amenities, house rules, photos), then `/landlord`. A landlord needs at least one listing before using the dashboard, so most of landlord onboarding is creating that first listing.

Dashboard routes stay locked until every required step is done. Answers can be edited later from **Profile**. The full field list is in section 6.

### 2.3 Tenant: finding roommates
1. **Swipe deck** (`/roommate`): other tenants ranked by `profile_recommendations.score`.
2. Each swipe saves one `swipes` row per direction (`left` or `right`).
3. **Likes tab:** tenants who swiped right on the current tenant and haven't been swiped on in return yet (view `pending_likes`).
4. **Match:** when both have swiped right, the trigger `swipes_create_match` creates one `matches` row for the pair. `tenant_a_id` is always the smaller id, so a pair can only exist once.
5. **Matches tab** (`/matches`): each match with the other tenant's name, photo, email and phone (phone only if that tenant turned `phone_visible` on).

### 2.4 Tenant: finding a house
1. **Houses tab** (`/houses`): active listings ranked by `house_recommendations.score`. Each card shows the cover photo, photo count, verified badge, whether the tenant liked it, and which of their matches liked it.
2. **House detail** (`/houses/:houseId`): photos, description, amenities, house rules. Never the landlord's contact details.
3. Tenants can like or unlike houses (`house_likes`). Matches see each other's likes on the cards (view `house_likes_by_matches`).

### 2.5 Applying together
1. One tenant in a match shares a house into the match (`match_houses` row). `shared_by` must be one of the two tenants; the trigger `match_houses_check_sharer` enforces this.
2. Each tenant clicks Apply on that shared house, which sets their side's `a_applied_at` or `b_applied_at`.
3. When both sides have applied, the trigger `match_houses_create_application` creates an `applications` row with status `pending`.

### 2.6 Landlord: listings and applications
1. **My Listings:** all of the landlord's houses with cover photo, status, verified badge and like count. Landlords can create, edit, hide (`draft`) or show (`active`), delete, and add or remove photos.
2. **Likes dialog** on a listing: names only of tenants who liked it. Never ids, emails, phones or photos.
3. **Applications:** pending applications on any of the landlord's houses. Opening one shows both tenants' full profiles (about, preferences, lifestyle, interests, prompt answers), but no email or phone.
4. **Confirm or ignore:** the status becomes `confirmed` or `ignored` and `decided_at` is set. Ignored applications drop off the list.
5. **After a confirm**, the two tenants see the landlord's name, email and phone (if visible) in their landlord contacts.

### 2.7 Behind the scenes
- **VLM pipeline:** downloads each listing's photos, sets `house_amenities.vlm_verified` per amenity (`null` = not checked yet) and `houses.verified`.
- **Ranking job (not owned by anyone yet):** fills `house_recommendations` and `profile_recommendations` with scores from 0 to 1 (`source` is `cold_start` or `model`). Until it exists, only the demo tenant has scores, from the seed.

### 2.8 Privacy rules (from the spec)
- Landlords never see tenant contact details from a like or before a confirm.
- Tenants never see landlord contact details except through a confirmed application.
- Phone numbers are only shown when the owner turned on `phone_visible`.

---

## 3. Areas, branches and stack

### 3.1 Areas
| Area | Covers |
|---|---|
| Backend A | auth (done), tenant onboarding, roommates, swipes, likes, matches, sharing and applying to houses, landlord contacts |
| Backend B | houses, listings, listing photos, landlord onboarding, applications (landlord side), `PUT /api/me` |
| Frontend | the React app |
| VLM | photo and amenity verification |
| AI / ranking | house and roommate recommendations |

Backend B is built, tested and maintained end to end by a single developer, independently of Backend A. It doesn't wait on or reuse Backend A code; the only shared pieces are the files listed in 8.4.

### 3.2 Branches
- Each area works on its own branch. Nothing is pushed straight to `main`.
- Backend B is developed and tested entirely on its own branch.

### 3.3 Repo layout
```
SyncSpace/
├── frontend/     React + TypeScript + Vite web app
├── backend/      Spring Boot API
└── supabase/
    ├── migrations/   schema, one file per change
    └── seed.sql      demo data
```

### 3.4 Stack
| Part | Tech |
|---|---|
| Database | Postgres on Supabase |
| Auth | Supabase Auth (the backend calls it; the frontend talks only to the backend) |
| Photo storage | Supabase Storage buckets, through the S3-compatible API |
| Backend | Spring Boot 4.2, Java 21, Gradle, Spring Data JPA, package `com.syncspace`, runs on http://localhost:8080 |
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS v4 + shadcn/ui, React Router, TanStack Query, Zustand, Zod, React Hook Form, Axios, Sonner, Vitest, oxlint. Runs on http://localhost:5173 |

Frontend library versions are in `frontend/package.json`.

---

## 4. Getting set up

### 4.1 Frontend
Requires **Node.js 20.19+ or 22.12+** and **Git**.

- macOS: `brew install node git`
- Windows: `winget install OpenJS.NodeJS.LTS` and `winget install Git.Git`, or the LTS installer from <https://nodejs.org>. After installing, reopen the terminal and check with `node -v` and `git --version`.

```bash
git clone <repo-url>
cd SyncSpace/frontend
npm install        # or npm ci for the exact versions in package-lock.json
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (type-check and build into `dist/`), `npm run preview` (serve the build), `npm run lint` (oxlint).

### 4.2 Backend
1. The `backend/` folder comes from the Backend A branch; merge it into the working branch first.
2. Install Java 21: `winget install EclipseAdoptium.Temurin.21.JDK`, then reopen the terminal. Gradle isn't needed, the project includes `gradlew`.
3. Copy `backend/.env.example` to `backend/.env` and fill in the values. Secret values are shared privately within the team, never in git or group chats. `.env` is gitignored and must never be committed.
   ```
   SUPABASE_URL=https://ktjzqtswslcqnzpgxzfw.supabase.co
   SUPABASE_KEY=
   DB_URL=jdbc:postgresql://<pooler-host>:5432/postgres
   DB_USER=postgres.ktjzqtswslcqnzpgxzfw
   DB_PASSWORD=
   # photo storage, see section 7
   S3_ENDPOINT=https://ktjzqtswslcqnzpgxzfw.storage.supabase.co/storage/v1/s3
   S3_REGION=eu-west-1
   S3_PUBLIC_URL=https://ktjzqtswslcqnzpgxzfw.supabase.co/storage/v1/object/public
   S3_ACCESS_KEY=
   S3_SECRET_KEY=
   ```
4. Start it:
   ```bash
   cd backend
   ./gradlew bootRun        # Windows: .\gradlew.bat bootRun
   ```
5. Get a token for testing:
   ```bash
   curl -X POST localhost:8080/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"landlord@syncspace.test","password":"password123"}'
   ```
   Every other request sends `Authorization: Bearer <accessToken>`. Tokens last an hour.

### 4.3 Supabase
- Project ref `ktjzqtswslcqnzpgxzfw`, region `eu-west-1`.
- Link the CLI once: `npx supabase login`, then `npx supabase link --project-ref ktjzqtswslcqnzpgxzfw`.
- New migrations are applied with `npx supabase db push`, or pasted into the SQL Editor.
- `supabase/seed.sql` loads the demo data.

### 4.4 Demo accounts
From `supabase/seed.sql`, all with password `password123`:

| Email | Role | Has |
|---|---|---|
| tenant@syncspace.test | tenant | 2 matches, likes on houses 101-103, recommendations |
| landlord@syncspace.test | landlord | houses 101-103, one pending application on 103 |
| declan@syncspace.test | landlord | houses 104-106 |
| niamh@syncspace.test | landlord | houses 107-108, one pending application on 107 |

Until it's connected to the backend, the frontend also has its own mock login in `frontend/src/mocks/users.json` (one tenant, one landlord).

---

## 5. Database

The schema is `supabase/migrations/20261113000000_initial_schema.sql`, plus the alignment migration that matches it to the onboarding forms (enum values, `houses.description`, the 10 prompts and 15 amenities). **Schema changes always go in a new file in `supabase/migrations/`.** An applied migration is never edited.

### 5.1 Tables
| Table | What it holds |
|---|---|
| `profiles` | every user: `name`, `role`, `first_login` (true = still onboarding), `created_at` |
| `profile_contacts` | private: `phone`, `phone_visible` |
| `tenants` | `age` (16-100), `university`, `course`, `bio`, `photo_url`, `onboarding_complete` |
| `tenant_house_preferences` | `budget_min`, `budget_max`, `preferred_areas` (text[]), `room_type`, `move_in_date`, `lease_months`, `max_housemates` |
| `tenant_lifestyle_preferences` | `sleep_schedule`, `noise_tolerance` (1-5), `cleanliness`, `work_schedule`, `social_level`, `guest_frequency`, `smoker`, `ok_with_smoking`, `has_pets`, `ok_with_pets` |
| `tenant_interests` | one row per interest |
| `prompts` | `prompt_id`, `text` (the 10 personality prompts) |
| `tenant_prompt_answers` | `slot` (1-3), `prompt_id`, `answer`. Max 3 per tenant, each prompt once |
| `landlords` | `photo_url` |
| `landlord_preferences` | `preferred_tenants`, `min_lease_months`, `references_required` |
| `houses` | `landlord_id`, `title`, `area`, `address`, `rent` (EUR/month), `room_type`, `available_from`, `rooms_available`, `description` (max 500), `verified` (VLM only), `status`, `created_at` |
| `house_preferences` | house rules: `pets_allowed`, `smoking_allowed`, `guest_policy`, `quiet_hours_start`, `quiet_hours_end`, `min_lease_months`, `max_occupants`, `extra_rules` |
| `house_photos` | `url` (bucket path), `position` (0 = cover), unique per house and position |
| `amenities` | amenity names |
| `house_amenities` | house ↔ amenity, `vlm_verified` (null = not checked) |
| `house_likes` | a tenant likes a house |
| `swipes` | one row per swipe: `swiper_id`, `target_id`, `direction` |
| `matches` | one row per mutual pair, `tenant_a_id < tenant_b_id`. Only created by trigger |
| `match_houses` | a house shared in a match: `shared_by`, `a_applied_at`, `b_applied_at` |
| `applications` | joint application: `status`, `created_at`, `decided_at`. Only created by trigger |
| `house_recommendations` | tenant ↔ house `score` (0-1), `source` |
| `profile_recommendations` | tenant ↔ candidate tenant `score` (0-1), `source` |

Signup creates only `profiles` and `profile_contacts`. The `tenants` and `landlords` rows are created during onboarding.

### 5.2 Enum values
The DB enums use exactly the values the onboarding forms send (`frontend/src/lib/onboardingOptions.ts`). Backend code uses these values; Postgres rejects anything else.

| Enum | Used by | Values |
|---|---|---|
| `user_role` | `profiles.role` | `tenant`, `landlord` |
| `room_type` | `tenant_house_preferences.room_type`, `houses.room_type` | `single`, `double`, `ensuite` |
| `sleep_schedule` | `tenant_lifestyle_preferences` | `early_bird`, `night_owl` |
| `cleanliness_level` | `tenant_lifestyle_preferences.cleanliness` | `very_tidy`, `tidy`, `relaxed` |
| `work_schedule` | `tenant_lifestyle_preferences` | `on_campus`, `from_home`, `mixed`, `night_shifts` |
| `social_level` | `tenant_lifestyle_preferences` | `homebody`, `balanced`, `social` |
| `guest_frequency` | `tenant_lifestyle_preferences.guest_frequency` | `rarely`, `weekends`, `often` |
| `guest_policy` | `house_preferences.guest_policy` | `no_overnight`, `weekends`, `welcome` |
| `tenant_type` | `landlord_preferences.preferred_tenants` (default `any`) | `any`, `student`, `professional` |
| `swipe_direction` | `swipes.direction` | `left`, `right` |
| `listing_status` | `houses.status` (default `active`) | `draft`, `active`, `pending`, `filled` |
| `application_status` | `applications.status` (default `pending`) | `pending`, `confirmed`, `ignored` |
| `rec_source` | recommendations `source` | `cold_start`, `model` |

Changing an enum later takes three edits: a new migration, the option in `onboardingOptions.ts`, and the Java enum or value set.

### 5.3 Triggers
They still run when the backend writes, so the backend doesn't repeat their work in Java.

| Trigger | Does |
|---|---|
| `on_auth_user_created` | new auth user → `profiles` + `profile_contacts` from the signup metadata (role is required) |
| `swipes_create_match` | right swipe + an existing right swipe the other way → `matches` row (safe if both swipe at once) |
| `match_houses_check_sharer` | `shared_by` must be one of the two tenants in the match |
| `match_houses_create_application` | both `a_applied_at` and `b_applied_at` set → `applications` row (`pending`) |

### 5.4 Functions and views
- **RPCs:** `apply_to_shared_house`, `decide_application`, `get_my_matches`, `get_my_landlord_contacts`. They use `auth.uid()`, which is empty on the backend's connection, so **the backend can't call them**. The endpoints re-implement their logic in Java (section 10).
- **Views:** `tenant_matches` (one row per tenant + matched tenant), `pending_likes` (Likes tab), `house_likes_by_matches` (likes from a tenant's matches). These work from the backend when filtered by `tenant_id = :me`.
- **Helper functions** used by RLS: `my_role()`, `is_match_member()`, `is_matched_with()`, `owns_house()`.

### 5.5 Row Level Security
RLS policies protect every table for browser users. The backend connects as `postgres`, so **RLS doesn't apply to the backend**: every endpoint checks permissions itself (section 8).

### 5.6 Seed data notes
- 8 demo houses (101-108) with photo rows (paths like `101/0.jpg`). No files exist at those paths yet, so the images show as broken until JPEGs are uploaded (section 7.5).
- The 10 prompts and 15 amenities come from the alignment migration.

---

## 6. Onboarding forms

Every step shows a progress bar (`Step 2 of 4`), **Back** and **Next**. **Next** stays disabled until the step's required fields are filled. Answers are saved as a draft along the way, so closing the tab loses nothing. Photos are the exception: they're kept in memory until the upload endpoints are wired up.

The values below are the DB values (section 5.2).

### 6.1 Tenant (4 steps)

**Step 1: About you** → `tenants`. All required: the columns allow nulls, but the roommate card needs every one.

| Field | Input | Column |
|---|---|---|
| Profile photo | 1 photo, JPG/PNG, max 5 MB | `photo_url` |
| Age | number, 16-100 | `age` |
| University or college | text | `university` |
| Course | text | `course` |
| Bio | textarea, max 300 characters | `bio` |

**Step 2: Accommodation** → `tenant_house_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Budget | range slider + number boxes, €300-€1,500 | numbers | `budget_min`, `budget_max` |
| Preferred areas | multi-select chips, at least 1 | text array | `preferred_areas` |
| Room type | single select | `single`, `double`, `ensuite` | `room_type` |
| Move-in date | date picker, today or later | `YYYY-MM-DD` | `move_in_date` |
| Lease length | single select | 3, 5, 9, 12 months | `lease_months` |
| Most housemates | single select | 1-5 (5 shows as "5+") | `max_housemates` |

Cork areas: Bishopstown, Blackrock, College Road, Douglas, Shandon, The Lough, Victoria Cross, Wilton.

**Step 3: Lifestyle** → `tenant_lifestyle_preferences`, `tenant_interests`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Sleep schedule | single select | `early_bird`, `night_owl` | `sleep_schedule` |
| Noise | scale 1-5 (1 = needs quiet, 5 = doesn't mind) | 1-5 | `noise_tolerance` |
| Cleanliness | single select | `very_tidy`, `tidy`, `relaxed` | `cleanliness` |
| Work / study | single select: mostly on campus, mostly at home, mix of both, night shifts | `on_campus`, `from_home`, `mixed`, `night_shifts` | `work_schedule` |
| Social style | single select: homebody, in between, very social | `homebody`, `balanced`, `social` | `social_level` |
| Guests | single select | `rarely`, `weekends`, `often` | `guest_frequency` |
| "Do you smoke?" | yes / no | boolean | `smoker` |
| "OK living with a smoker?" | yes / no | boolean | `ok_with_smoking` |
| "Do you have a pet?" | yes / no | boolean | `has_pets` |
| "OK living with pets?" | yes / no | boolean | `ok_with_pets` |
| Interests | chips + "add your own", 1-6 | one row each | `tenant_interests.interest` |

Suggested interests: Cooking, Hiking, Gym, Reading, Gaming, Music, Coffee, Board games, Sports, Movies.

**Step 4: Personality prompts** → `tenant_prompt_answers`. The tenant picks **3** prompts and answers each (max 150 characters). One row per answer: `slot` is 1-3 in the order picked, `prompt_id` comes from this table (the `prompts` table holds exactly these):

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

### 6.2 Landlord (5 steps)

**Step 1: About you** → `landlords`, `landlord_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| Profile photo | 1 photo, optional | bucket path | `landlords.photo_url` |
| "Who would you like to rent to?" | single select, default Anyone | `any`, `student`, `professional` | `preferred_tenants` |
| "Shortest lease you'll accept" | single select, default No minimum | 1, 3, 5, 9, 12 months | `min_lease_months` |
| "Do tenants need references?" | yes / no, default No | boolean | `references_required` |

**Step 2: Property details** → `houses`

| Field | Input | Column |
|---|---|---|
| Listing title | text, max 60 | `title` |
| Area | single select (Cork areas) | `area` |
| Address | text | `address` |
| Rent | slider + number box, €300-€3,000 | `rent` |
| Rooms available | slider + number box, 1-10 | `rooms_available` |
| Room type | `single`, `double`, `ensuite` | `room_type` |
| Available from | date picker | `available_from` |
| Description | textarea, max 500 | `description` |

**Step 3: Amenities** → `house_amenities`. Chips, at least 1. Each links to the `amenities` table by name (the table holds exactly these 15). `vlm_verified` is filled in later by the VLM pipeline.

WiFi, Bills included, Central heating, Kitchen access, Washing machine, Dryer, Dishwasher, Study desk, Double bed, En-suite, Garden, Balcony, Parking, Bike storage, Lift.

**Step 4: House rules** → `house_preferences`

| Field | Input | Stored as | Column |
|---|---|---|---|
| "Are pets allowed?" | yes / no | boolean | `pets_allowed` |
| "Is smoking allowed?" | yes / no | boolean | `smoking_allowed` |
| Guests | single select: no overnight guests, guests on weekends, guests welcome | `no_overnight`, `weekends`, `welcome` | `guest_policy` |
| Quiet hours start | None, 9pm, 10pm, 11pm, Midnight | `HH:MM` or empty | `quiet_hours_start` |
| Quiet hours end | 7am, 8am, 9am (only if a start is picked) | `HH:MM` | `quiet_hours_end` |
| Shortest lease for this house | single select | 1, 3, 5, 9, 12 | `min_lease_months` |
| Most people living in the house | slider + number box, 1-12 | number | `max_occupants` |
| "Anything else?" | textarea, optional, max 300 | text | `extra_rules` |

**Step 5: Photos** → `house_photos`. At least 1, up to 10, JPG or PNG, max 5 MB each. `position` is the display order; the first is the cover.

### 6.3 Saving onboarding
- **Tenant:** `PUT /api/tenants/me` saves steps 1-4, and `POST /api/tenants/me/photo` saves the photo.
- **Landlord:** step 1 is `PUT /api/landlords/me/preferences` + `POST /api/landlords/me/photo`. Steps 2-4 are one `POST /api/listings`. Step 5 is `POST /api/listings/{id}/photos`, called after the listing exists because it needs the house id.
- When onboarding is finished, `profiles.first_login` is set to false (and `tenants.onboarding_complete` to true for tenants). See 13.1 on the two flags.

---

## 7. Photo storage

Photos live in **Supabase Storage**, in the same Supabase project as the database, so the whole team shares them with nothing to install. The backend uploads through Supabase's S3-compatible API with the standard AWS S3 client, so moving to AWS S3 or another provider later is only a config change.

### 7.1 The DB stores paths, not URLs
`house_photos.url`, `tenants.photo_url` and `landlords.photo_url` hold the path inside the bucket. The backend turns paths into full URLs in every response, so the frontend only ever sees full URLs.

| Column | Bucket | Path |
|---|---|---|
| `house_photos.url` | `house-photos` | `{houseId}/{uuid}.jpg` |
| `tenants.photo_url` | `tenant-photos` | `tenants/{id}/{uuid}.jpg` |
| `landlords.photo_url` | `tenant-photos` | `landlords/{id}/{uuid}.jpg` |

Full URL = `<S3_PUBLIC_URL>/<bucket>/<path>`, for example `https://ktjzqtswslcqnzpgxzfw.supabase.co/storage/v1/object/public/house-photos/101/0.jpg`. Anything that reads the columns directly (the VLM pipeline, `get_my_matches()`) builds the URL the same way.

### 7.2 Setup, done once for the team (Supabase dashboard)
1. **Storage → New bucket:** create `house-photos`, turn on **Public bucket** so the frontend can show images without a token, turn on the upload size limit and set it to 5 MB, set allowed MIME types to `image/jpeg, image/png`, and save. Repeat for `tenant-photos`. The limits are a second check behind the backend's.
2. **Project Settings → Storage → S3 Connection:** make sure the S3 connection is enabled and note the endpoint and region. Under **S3 Access Keys**, click **New access key** and copy the access key ID and secret. The secret is only shown once.
3. Put the keys in `backend/.env` (`S3_ACCESS_KEY`, `S3_SECRET_KEY`) and share them privately with the other backend developers.
4. Test: upload any JPEG as `house-photos/101/0.jpg` and open its public URL in a browser.

These S3 keys **bypass all storage access rules**, like the `postgres` login does for the database. They only go in `backend/.env`, never in the frontend or git. The frontend never uploads to storage directly; it sends files to the backend.

### 7.3 Backend config
The `.env` values are in section 4.2. `S3_REGION` must match the S3 Connection page, or every request fails with a signature error.

`application.properties` (shared file, so the other backend area is told before it changes):
```
s3.endpoint=${S3_ENDPOINT}
s3.region=${S3_REGION}
s3.public-url=${S3_PUBLIC_URL}
s3.access-key=${S3_ACCESS_KEY}
s3.secret-key=${S3_SECRET_KEY}
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=50MB
```
(50 MB because a listing can upload up to 10 photos at once.)

`build.gradle` (shared file, same rule):
```gradle
implementation platform('software.amazon.awssdk:bom:2.31.0')   // or the latest 2.x
implementation 'software.amazon.awssdk:s3'
```

```java
@Configuration
public class S3Config {

	@Bean
	S3Client s3(@Value("${s3.endpoint}") String endpoint,
			@Value("${s3.region}") String region,
			@Value("${s3.access-key}") String accessKey,
			@Value("${s3.secret-key}") String secretKey) {
		return S3Client.builder()
				.endpointOverride(URI.create(endpoint))
				.region(Region.of(region))
				.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
				// Supabase addresses buckets as host/bucket/key, not bucket.host/key
				.forcePathStyle(true)
				// newer SDK versions add checksums that some S3-compatible stores reject
				.requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
				.build();
	}
}
```

All photo handling goes in one `PhotoStorage` service in a `photo` package, used by both backend areas. Nothing else talks to S3 or builds photo URLs:
```java
// returns the path to save in the DB
public String upload(String bucket, String path, byte[] bytes, String contentType) {
	s3.putObject(b -> b.bucket(bucket).key(path).contentType(contentType), RequestBody.fromBytes(bytes));
	return path;
}

public void delete(String bucket, String path) {
	s3.deleteObject(b -> b.bucket(bucket).key(path));
}

// for responses: path from the DB -> URL the frontend can load. Null stays null.
public String url(String bucket, String path) {
	return path == null ? null : publicUrl + "/" + bucket + "/" + path;
}
```
Every response field with a photo (`coverPhoto`, `photos[].url`, `photoUrl`) goes through `url(...)`.

### 7.4 Rules for every upload
- **Paths are built from ids plus a random UUID.** The uploaded file's name is never used.
- **The file's first bytes are checked, not just `Content-Type`** (which the client sets). JPEG starts `FF D8 FF`, PNG starts `89 50 4E 47`. Max 5 MB. The real type is stored as the object's content type.
- **A new path on every upload, never an overwrite.** Browsers and the CDN cache images by URL, so a replaced file keeps showing the old image. The new file is uploaded, the DB is pointed at it, then the old object is deleted.
- **Order of operations.** Storage isn't part of the DB transaction:
  - Adding: upload first, then write the DB row(s). If the DB write fails, the just-uploaded objects are deleted.
  - Removing: delete the DB row first, then the object. If the object delete fails, it's logged and the request carries on. An orphan file is better than a row pointing at nothing.
- **Small files** (optional, worth it). The free plan has about 1 GB, and Supabase's automatic image resizing is paid-only. Phone photos are 3-5 MB; shrunk to about 1600px wide JPEG they're a few hundred KB. The simplest place to shrink them is the frontend, before sending. The backend still checks type and size.

### 7.5 Demo photos
The seed's `house_photos` paths (`101/0.jpg` and so on) have no files yet. For the demo, any JPEGs can be uploaded in the dashboard: Storage → `house-photos` → folder `101` → upload as `0.jpg`, and so on. Counts: 101: 7, 102: 5, 103: 4, 104: 6, 105: 8, 106: 3, 107: 5, 108: 4 (positions start at 0).

---

## 8. How the backend works

### 8.1 Permissions are checked in Java
The backend connects to Postgres as the full-access `postgres` user, so **RLS doesn't apply**. Every endpoint checks that the caller is allowed (owns the house, is a tenant, is in the match…). A missing check means any logged-in user can do it.

`spring.jpa.hibernate.ddl-auto` is always `none`.

### 8.2 Who is calling
Spring validates the Supabase token. The caller's id comes from the token:
```java
@GetMapping("/api/listings/mine")
public List<ListingSummary> mine(@AuthenticationPrincipal Jwt jwt) {
	UUID me = UUID.fromString(jwt.getSubject());
	...
}
```
Every route except `/api/auth/*` already requires a valid token (`config/SecurityConfig.java`), so `jwt` is never null.

The token doesn't say whether the caller is a tenant or a landlord; that's `profiles.role`. A `Roles` helper in the `profile` package handles it. Backend B adds it, and Backend A can use it too:
```java
@Component
public class Roles {

	private final ProfileRepository profiles;

	public Roles(ProfileRepository profiles) {
		this.profiles = profiles;
	}

	public UUID require(Jwt jwt, UserRole role) {
		UUID id = UUID.fromString(jwt.getSubject());
		var p = profiles.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "no profile"));
		if (p.getRole() != role) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only for " + role + "s");
		}
		return id;
	}
}
```

### 8.3 Errors
Errors are thrown as `ResponseStatusException` with a short lowercase message. `config/ErrorHandler.java` turns it into `{"message": "..."}`:
```java
throw new ResponseStatusException(HttpStatus.NOT_FOUND, "listing not found");
```
- 400 bad input, 403 wrong role, 404 doesn't exist, 409 conflict.
- Validation annotations (`@NotBlank`, `@Size`, `@Min`…) on request records plus `@Valid` give a 400 with the field name automatically.
- When something exists but belongs to someone else, the response is **404, not 403**, so ids can't be probed.
- `ErrorHandler` also maps Supabase Auth errors to friendly messages (wrong email or password, account exists, rate limits, session expired).

### 8.4 Code style
Same as `auth/` and `profile/`:
- tabs, constructor injection (no `@Autowired` on fields)
- request and response bodies are Java records, JSON is camelCase
- one package per area, so the two backend areas don't edit the same files. Backend A: `tenant`, `roommate`, `swipe`, `match`. Backend B: `landlord`, `listing`, `house`, `application`, `photo`
- comments explain the "why", not the "what"
- `@Transactional` on any service method that writes to more than one table

**Shared files:** `SecurityConfig`, `ErrorHandler`, `application.properties`, `build.gradle`. Changes to them are agreed between both backend areas first.

### 8.5 Mapping tables with JPA
`Profile`, `ProfileContact` and `UserRole` in `profile/` are the working examples.

**Postgres enums:** a Java enum whose constants are exactly the DB labels (lowercase):
```java
public enum TenantType { any, student, professional }
```
```java
@Enumerated(EnumType.STRING)
@JdbcTypeCode(SqlTypes.NAMED_ENUM)
@Column(name = "preferred_tenants")
private TenantType preferredTenants;
```

`room_type` has the label `double`, a Java keyword, so it can't be an enum constant. It's mapped as a `String` with a cast on write and validated by hand:
```java
@ColumnTransformer(write = "?::room_type")
@Column(name = "room_type")
private String roomType;
```
```java
static final Set<String> ROOM_TYPES = Set.of("single", "double", "ensuite");
```
Without the cast, Postgres refuses a plain string in an enum column.

**Other types:** `text[]` = `@JdbcTypeCode(SqlTypes.ARRAY) List<String>`, `DATE` = `LocalDate`, `TIME` = `LocalTime`, `TIMESTAMPTZ` = `OffsetDateTime`, `SMALLINT` = `Short` (or `Integer` with `@Column(columnDefinition = "smallint")`), `BIGINT` = `Long`.

**Generated ids** (`houses.house_id`, `house_photos.photo_id`, `matches.match_id`, `applications.application_id`): `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`.

**Columns the DB fills in** (`created_at`, `verified`, `status` defaults): `@Column(insertable = false, updatable = false)` when the code never writes them.

**Link tables with two-column keys** (`house_amenities`, `house_likes`, `swipes`): an `@EmbeddedId` entity works, but a native query is usually less code:
```java
public interface HouseLikeRepository extends Repository<House, Long> {

	@Modifying
	@Query(value = "insert into house_likes (tenant_id, house_id) values (:tenant, :house) on conflict do nothing",
			nativeQuery = true)
	void like(UUID tenant, long house);

	@Modifying
	@Query(value = "delete from house_likes where tenant_id = :tenant and house_id = :house", nativeQuery = true)
	void unlike(UUID tenant, long house);
}
```
`@Modifying` queries must run inside `@Transactional`.

Read-only screens that join many tables (house grid, applications list) can use a native query or JPQL projection into a record; not every table needs an entity.

---

## 9. API endpoints: the split

All paths start with `/api`. JSON in and out. Every route except `/api/auth/*` needs `Authorization: Bearer <accessToken>`. Houses, photos, matches and applications have number ids (`bigint`); people have UUID strings.

### 9.1 Done
| Endpoint | What |
|---|---|
| `POST /api/auth/signup` | sign up (name, email, phone, password, role, phoneVisible) |
| `POST /api/auth/login` | log in |
| `POST /api/auth/refresh` | refresh token |
| `POST /api/auth/logout` | log out |
| `POST /api/auth/forgot-password` | send reset email |
| `POST /api/auth/reset-password` | set new password |
| `GET /api/me` | current user: id, name, email, role, firstLogin |

### 9.2 Backend A: tenants, roommates, matches
| Endpoint | What |
|---|---|
| `PUT /api/tenants/me` | tenant onboarding: about, preferences, lifestyle, interests, prompts |
| `GET /api/tenants/me` | own tenant profile |
| `POST /api/tenants/me/photo` | tenant photo |
| `GET /api/roommates` | swipe deck |
| `GET /api/roommates/{id}` | one tenant's profile |
| `POST /api/swipes` | swipe left or right (`targetId`, `direction`) |
| `GET /api/likes` | Likes tab: tenants who swiped right on the caller |
| `GET /api/matches` | the caller's matches |
| `POST /api/matches/{id}/houses` | share a house into the match (`houseId`) |
| `GET /api/matches/{id}/houses` | houses shared in the match, and who has applied |
| `POST /api/matches/{id}/apply` | apply to a shared house (`houseId`) |
| `GET /api/applications/mine` | the tenant's application statuses |
| `GET /api/landlord-contacts` | landlord contact details after a confirm |

### 9.3 Backend B: houses, listings, landlords
| Endpoint | What |
|---|---|
| `PUT /api/me` | edit name, phone and phone visibility |
| `PUT /api/landlords/me/preferences` | landlord onboarding preferences |
| `POST /api/landlords/me/photo` | landlord photo |
| `POST /api/listings` | create listing |
| `GET /api/listings/mine` | My Listings grid |
| `GET /api/listings/{id}` | listing detail (owner) |
| `PUT /api/listings/{id}` | edit listing, hide or show it |
| `DELETE /api/listings/{id}` | delete listing |
| `POST /api/listings/{id}/photos` | add photos |
| `DELETE /api/listings/{id}/photos/{photoId}` | remove photo |
| `GET /api/listings/{id}/likes` | names of tenants who liked it |
| `GET /api/applications` | landlord's pending applications |
| `GET /api/applications/{id}` | both tenants' full profiles |
| `POST /api/applications/{id}/confirm` | confirm |
| `POST /api/applications/{id}/ignore` | ignore |
| `GET /api/houses` | tenant house grid |
| `GET /api/houses/{id}` | house detail |
| `POST` / `DELETE /api/houses/{id}/like` | like / unlike |

---

## 10. API endpoint details

### 10.1 Tenants, roommates and matches (Backend A)
The Backend A area writes the full request and response shapes. What each endpoint has to respect from the schema:
- **`PUT /api/tenants/me`:** creates the `tenants` row if missing, then upserts `tenant_house_preferences` and `tenant_lifestyle_preferences`, and replaces `tenant_interests` (1-6) and `tenant_prompt_answers` (exactly 3, slots 1-3, distinct prompts), all in one transaction. Enum values from 5.2. Finishing sets `onboarding_complete` / `first_login` (13.1).
- **`POST /api/tenants/me/photo`:** same rules as the landlord photo, path `tenants/{id}/{uuid}.jpg` in `tenant-photos`, through `PhotoStorage`.
- **`GET /api/roommates`:** other tenants who finished onboarding and haven't been swiped on yet, ranked by `profile_recommendations.score`. The card has no email or phone.
- **`GET /api/roommates/{id}`:** one tenant's full profile (about, preferences, lifestyle, interests, prompt answers), no email or phone.
- **`POST /api/swipes`:** upserts the `swipes` row. The trigger creates the match. The response says whether a match was created, so the frontend can show "It's a match".
- **`GET /api/likes`:** from the `pending_likes` view, `where tenant_id = :me`.
- **`GET /api/matches`:** same logic as `get_my_matches()`: the other tenant's name, photo, email, and phone only if `phone_visible`.
- **`POST /api/matches/{id}/houses`:** the caller must be in the match. Inserts `match_houses` with `shared_by = :me`.
- **`GET /api/matches/{id}/houses`:** the caller must be in the match. Shared houses with `a_applied_at` / `b_applied_at`, so the frontend can show who has applied.
- **`POST /api/matches/{id}/apply`:** same logic as `apply_to_shared_house()`: the caller must be in the match and the house shared in it. Sets only the caller's side (`a_applied_at` if they're `tenant_a_id`, else `b_applied_at`), keeping the existing value if already set. The trigger creates the application.
- **`GET /api/applications/mine`:** applications for any match the caller is in, with house title and status.
- **`GET /api/landlord-contacts`:** same logic as `get_my_landlord_contacts()`: only `confirmed` applications where the caller is in the match. Phone only if `phone_visible`.

### 10.2 Profile (Backend B)

#### `PUT /api/me`  (any logged-in user)
Request (all fields optional, only the ones sent are changed):
```json
{ "name": "Aanya Kapoor", "phone": "+353 87 123 4567", "phoneVisible": true }
```
- `name`: not blank if sent.
- One `@Transactional` method updates `profiles.name` and `profile_contacts.phone` / `phone_visible`. Both rows already exist from signup.
- Lives in the existing `profile` package (`ProfileRepository`, `ProfileContactRepository`).

Response: `204`. `GET /api/me` doesn't return phone or `phoneVisible` yet. The Profile page needs them, so they get added to `MeResponse`.

### 10.3 Landlord onboarding (Backend B)

#### `PUT /api/landlords/me/preferences`  (landlord)
Onboarding step 1, and editing it later from the profile.
```json
{ "preferredTenants": "any", "minLeaseMonths": 1, "referencesRequired": false }
```
- `preferredTenants`: `any` / `student` / `professional`
- `minLeaseMonths`: one of 1, 3, 5, 9, 12

1. Role must be landlord.
2. **New landlords have no `landlords` row yet** (signup only creates `profiles` and `profile_contacts`), so `landlords (id)` is inserted if missing (`insert ... on conflict do nothing`).
3. Upsert `landlord_preferences`.

Response: `204`.

#### `POST /api/landlords/me/photo`  (landlord)
Multipart, field `file`. Optional during onboarding.
1. Role landlord; create the `landlords` row if missing.
2. Check the type by the first bytes (jpeg/png) and the size (5 MB).
3. Upload to `tenant-photos` at `landlords/{id}/{random uuid}.jpg` (or `.png`). New path each time.
4. Save the path in `landlords.photo_url`, then delete the previous photo's object if there was one.

Response: `{ "photoUrl": "https://ktjzqtswslcqnzpgxzfw.supabase.co/storage/v1/object/public/tenant-photos/landlords/{id}/{uuid}.jpg" }`

### 10.4 Listings: the landlord's own houses (Backend B)

#### `POST /api/listings`  (landlord)
Creates a whole listing in one go: landlord onboarding steps 2-4, and the "add listing" form later. The body mirrors `LandlordOnboarding` in `frontend/src/types/index.ts`:
```json
{
  "title": "Bright 3-bed near UCC",
  "area": "College Road",
  "address": "14 College Road, Cork",
  "rent": 750,
  "roomType": "double",
  "availableFrom": "2027-01-04",
  "roomsAvailable": 2,
  "description": "Three-bed semi-d five minutes from UCC...",
  "amenities": ["WiFi", "Washing machine", "Study desk"],
  "petsAllowed": false,
  "smokingAllowed": false,
  "guestPolicy": "weekends",
  "quietHoursStart": "23:00",
  "quietHoursEnd": "07:00",
  "minLeaseMonths": 9,
  "maxOccupants": 3,
  "extraRules": "Bins out Tuesday night."
}
```
Validation:
- `title` required, max 60
- `area` required, one of the 8 Cork areas
- `address` required
- `rent` 300-3000
- `roomType` one of `single`, `double`, `ensuite`
- `availableFrom` a date, today or later
- `roomsAvailable` 1-10
- `description` optional, max 500
- `amenities` at least 1, every name must exist in `amenities` (400 naming the bad one)
- `guestPolicy` one of `no_overnight`, `weekends`, `welcome`
- `quietHoursStart` optional (`HH:MM`), `quietHoursEnd` required only if start is given
- `minLeaseMonths` one of 1, 3, 5, 9, 12
- `maxOccupants` 1-12
- `extraRules` optional, max 300

In one `@Transactional` method:
1. Role landlord. Create the `landlords` row if missing.
2. Insert `houses`. `verified` (VLM only) and `status` (defaults to `active`) aren't set.
3. Insert `house_preferences` with the same `house_id`.
4. Look up amenity ids by name and insert one `house_amenities` row each, with `vlm_verified` left null.

Response: `201` with `{ "houseId": 109 }`. Photos are uploaded afterwards, because they need the house id.

#### `GET /api/listings/mine`  (landlord)
Every house where `landlord_id = :me`, newest first, including drafts.
```json
[
  {
    "houseId": 101,
    "title": "Bright 3-bed near UCC",
    "address": "14 College Road, Cork",
    "area": "College Road",
    "rent": 750,
    "status": "active",
    "verified": true,
    "coverPhoto": "https://ktjzqtswslcqnzpgxzfw.supabase.co/storage/v1/object/public/house-photos/101/0.jpg",
    "likeCount": 2
  }
]
```
- `coverPhoto`: from the `house_photos` row with the lowest `position`, or null.
- `likeCount`: `count(*)` from `house_likes`, in one query with a join or subquery, not one query per house.

#### `GET /api/listings/{id}`  (landlord, owner only)
1. 404 if it doesn't exist **or** `landlord_id` isn't the caller.
2. Returns everything from `houses` and `house_preferences`, the amenities with `vlmVerified` (true / false / null = not checked), the photos in `position` order (`photoId`, `url`, `position`), and `likeCount`.

#### `PUT /api/listings/{id}`  (landlord, owner only)
Same body and validation as POST. In one transaction:
1. 404 unless the caller owns it.
2. Update `houses` (not `verified`).
3. Update `house_preferences`.
4. Amenities: **not deleted and re-inserted wholesale**, which would throw away the VLM results. Only the removed ones are deleted and only the new ones inserted.

Optional `status` field: the landlord can set `draft` or `active`. `pending` and `filled` wait on 13.1.

Response: `204`.

#### `DELETE /api/listings/{id}`  (landlord, owner only)
1. 404 unless the caller owns it.
2. Read the house's photo paths, then delete the `houses` row. Foreign keys cascade to preferences, photos, amenities, likes, match_houses and applications.
3. After the commit, delete those objects from `house-photos`. If that fails, it's logged and the request still succeeds.

Response: `204`.

#### `POST /api/listings/{id}/photos`  (landlord, owner only)
Multipart, one or more `files`.
1. 404 unless the caller owns it.
2. Max 10 photos per house in total (existing + new), jpeg/png by first bytes, 5 MB each. All are checked before any is uploaded.
3. Upload each to `house-photos` at `{houseId}/{random uuid}.jpg` (or `.png`).
4. Insert `house_photos` rows with those paths in `url`. `position` continues after the current highest. `(house_id, position)` is unique, so this runs in a transaction. If the insert fails, the just-uploaded objects are deleted.

Response: `201` with the photo list (`photoId`, `url` as a full URL, `position`).

#### `DELETE /api/listings/{id}/photos/{photoId}`  (landlord, owner only)
1. 404 unless the caller owns the house and the photo belongs to it.
2. A listing needs at least 1 photo, so 409 if it's the last one.
3. Delete the row, then the object. Positions can have gaps; the frontend sorts by them. If the cover (0) is deleted, the next lowest becomes the cover.

Response: `204`.

#### `GET /api/listings/{id}/likes`  (landlord, owner only)
**Names only.** No ids, emails, phones or photos.
```sql
select p.name
from house_likes hl
join profiles p on p.id = hl.tenant_id
where hl.house_id = :houseId
order by hl.created_at desc
```
Response: `{ "count": 2, "names": ["Aanya Kapoor", "Rohan Mehta"] }`

### 10.5 Applications: landlord side (Backend B)

#### `GET /api/applications`  (landlord)
Pending applications on the landlord's houses, newest first.
```sql
select a.application_id, a.created_at, h.house_id, h.title,
       m.tenant_a_id, m.tenant_b_id
from applications a
join houses h  on h.house_id = a.house_id
join matches m on m.match_id = a.match_id
where h.landlord_id = :me and a.status = 'pending'
order by a.created_at desc
```
Then name and photo are added for both tenants (`profiles.name`, `tenants.photo_url` through `PhotoStorage.url`).
```json
[
  {
    "applicationId": 1,
    "createdAt": "2026-11-11T09:30:00Z",
    "house": { "houseId": 103, "title": "Quiet house with garden" },
    "tenants": [
      { "id": "00000000-...-0201", "name": "Aanya Kapoor", "photoUrl": null },
      { "id": "00000000-...-0202", "name": "Rohan Mehta", "photoUrl": null }
    ]
  }
]
```
Ignoring removes an application from this list just by its status changing; nothing is deleted.

#### `GET /api/applications/{id}`  (landlord, owner of the house)
Both tenants in full: about (age, university, course, bio, photo), house preferences, lifestyle, interests, prompt answers. **No email or phone.**
1. 404 unless the application's house belongs to the caller.
2. Load both tenants from `tenants`, `tenant_house_preferences`, `tenant_lifestyle_preferences`, `tenant_interests` and `tenant_prompt_answers` (joined to `prompts` for the prompt text), plus `profiles.name`. The photo goes through `PhotoStorage.url`. Backend B builds this response itself in the `application` package.

#### `POST /api/applications/{id}/confirm` and `/ignore`  (landlord, owner of the house)
Replaces the `decide_application` RPC:
1. Load the application with its house. 404 unless the house belongs to the caller.
2. 409 if `status` isn't `pending`.
3. Set `status = 'confirmed'` or `'ignored'`, and `decided_at = now()`.
4. Confirm only: possibly change the house to `pending` / `filled` (waiting on 13.1).

Response: `204`. After a confirm, the tenants see the landlord's contact through `GET /api/landlord-contacts`.

### 10.6 Houses: tenants browsing (Backend B)

#### `GET /api/houses`  (tenant)
1. Role tenant.
2. Houses with `status = 'active'`. Never drafts, never the landlord's contact.
3. Ordered by `house_recommendations.score` for this tenant, descending. Houses with no score go last, newest first.
4. For each house also:
   - cover photo and total photo count (the card shows `+X`)
   - `likedByMe`: whether `house_likes` has (caller, house)
   - `likedByMatches`: names of the caller's matches who liked it, from `house_likes_by_matches` `where tenant_id = :me`, joined to `profiles`

A few set-based queries (houses + scores in one, then photos, likes and match likes each in one query for all the house ids), not a loop per house.

The response is close to the frontend's `House` type:
```json
[
  {
    "id": 101,
    "landlordId": "00000000-...-0301",
    "title": "Bright 3-bed near UCC",
    "area": "College Road",
    "address": "14 College Road, Cork",
    "rent": 750,
    "roomType": "double",
    "availableFrom": "2027-01-04",
    "rooms": 2,
    "matchScore": 94,
    "coverPhoto": "https://ktjzqtswslcqnzpgxzfw.supabase.co/storage/v1/object/public/house-photos/101/0.jpg",
    "photoCount": 7,
    "verified": true,
    "likedByMe": true,
    "likedByMatches": ["Aanya Kapoor"]
  }
]
```
`matchScore` = score × 100, rounded; null if there's no score. Optional filters if time allows: `?area=Douglas&maxRent=800`.

#### `GET /api/houses/{id}`  (tenant)
Same fields as the grid plus `description`, all `photos` (URLs in position order), `amenities` (names) and the rules from `house_preferences` (petsAllowed, smokingAllowed, guestPolicy, quietHoursStart, quietHoursEnd, minLeaseMonths, maxOccupants, extraRules).
- 404 if it doesn't exist or is a draft.
- **Never landlord contact details.**

#### `POST` / `DELETE /api/houses/{id}/like`  (tenant)
1. Role tenant.
2. The `tenants` row must exist (`house_likes.tenant_id` points at it). If it's missing, 409 "finish onboarding first".
3. The house must exist and not be a draft (404).
4. Like: `insert ... on conflict do nothing`. Unlike: delete. Both return `204` and are safe to call twice.

---

## 11. Frontend details

### 11.1 Routes
| Route | Page | Status |
|---|---|---|
| `/`, `/login` | log in | built |
| `/signup` | create an account | built |
| `/forgot-password` | request a reset link | built |
| `/onboarding` | tenant or landlord onboarding (any logged-in user) | built |
| `/houses` | tenant: ranked house grid, like houses | built |
| `/houses/:houseId` | tenant: house detail | built |
| `/roommate` | tenant: swipe deck | built |
| `/matches`, `/profile` | tenant | placeholders |
| `/landlord` | landlord dashboard | placeholder (`MyListingsPage` and `ListingDetailPage` exist but aren't routed yet) |

Tenant and landlord routes need login and the right role. Any other URL redirects to `/login`. Auth pages are responsive: full-screen form on phones, a centered card on tablets, a split screen with a brand panel on desktop.

### 11.2 Structure
```
frontend/
├── index.html
├── vite.config.ts          # Vite + Tailwind plugin + @/ alias
├── components.json         # shadcn/ui config
└── src/
    ├── main.tsx            # entry point, wraps App in BrowserRouter
    ├── App.tsx             # routes + Toaster
    ├── index.css           # Tailwind, theme colours, font
    ├── pages/              # one component per route
    ├── components/
    │   ├── AuthLayout.tsx  # shared layout for login / sign up / reset
    │   ├── onboarding/     # one component + Zod schema per step (steps.ts)
    │   └── ui/             # shadcn components
    ├── services/           # API calls: houseService, landlordService, roommateService
    ├── stores/             # Zustand: auth, house, landlord, photo, preferences, roommate
    ├── mocks/              # users.json, houses.json until the backend is connected
    ├── types/index.ts      # TenantOnboarding, LandlordOnboarding, House…
    └── lib/                # utils.ts (cn helper), onboardingOptions.ts (all enum values and option lists)
```
- Imports can use `@/`, for example `import { Button } from "@/components/ui/button"`.
- There's no `tailwind.config.js` or `postcss.config.js`: Tailwind v4 is set up through the Vite plugin and `src/index.css`.
- shadcn components are added with `npx shadcn@latest add dialog card` and copied into `src/components/ui/`.

### 11.3 How onboarding maps to the code
- Answers live in `stores/preferencesStore.ts` (Zustand + `persist`), keyed by user id, with a `completed` flag.
- Field names in `types/index.ts` are the column names in camelCase, grouped by table.
- All enum values and option lists are in `lib/onboardingOptions.ts` and match the DB enums (5.2).
- Each step is a component plus a Zod schema in `components/onboarding/steps.ts`. **Next** only enables when the schema passes.

### 11.4 Mock data until the backend is connected
- `src/mocks/users.json`: one demo tenant and one demo landlord for the mock login.
- `src/mocks/houses.json`: the listings on `/houses` (same photo counts as the seed).
- Login state and liked houses are kept in local storage, so they survive a refresh. Logging out from the header switches accounts.
- Connecting means swapping the mock imports in `src/services/` for Axios calls to the Spring backend (`http://localhost:8080/api/...`). The frontend talks only to the backend, never to Supabase directly. Photos go to the backend upload endpoints. The backend's allowed origins are in `app.cors.origins`.

### 11.5 Troubleshooting
- **Windows: "running scripts is disabled on this system":** run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **Strange install errors:** delete `node_modules` and run `npm install` again.
- **Port 5173 is busy:** `npm run dev -- --port 3000`

---

## 12. Testing and pushing

### 12.1 Backend: every endpoint is tried with at least
- the happy path with the right demo account
- the wrong role (tenant token on a landlord endpoint): 403
- someone else's data (`declan@syncspace.test` asking for house 101): 404
- bad input (missing field, out of range, unknown amenity): 400 with a readable message
- then a look at the rows in the Supabase Table Editor, and for photo endpoints the bucket under Storage (and a returned URL opened in the browser)

`./gradlew build` must pass before pushing. For the frontend, `npm run build` and `npm run lint`.

### 12.2 Pushing
- Small commits, one thing each (`add listing create endpoint`, `add house likes`).
- Each area pushes to its own branch (3.2).

### 12.3 Security rules
- `backend/.env` and keys are never committed.
- The Supabase secret key, the DB password and the S3 keys stay on the backend only, never in the frontend or git.
- `spring.jpa.hibernate.ddl-auto` stays `none`. Schema changes go in a new migration file.
- Every endpoint checks the caller's role and ownership itself (RLS doesn't protect the backend).

---

## 13. Open questions and to-dos

### 13.1 Decisions still open
- **Two onboarding flags:** `profiles.first_login` and `tenants.onboarding_complete` seem to mean the same thing, and landlords only have `first_login`. Which one decides whether onboarding shows? Suggestion: `first_login` for everyone, and the other is ignored or dropped.
- **What a confirmed application does to the listing:** set it to `pending` or `filled`, reduce `rooms_available`, or nothing?
- **Phone number:** asked at signup, not during onboarding. Editable later with `PUT /api/me`.
- **Ranking job:** no one owns `house_recommendations` / `profile_recommendations` yet.

### 13.2 To-dos
- [ ] Push the alignment migration and apply it to the Supabase project (`npx supabase db push`).
- [ ] Create the two storage buckets and the S3 access key (7.2); share the keys privately.
- [ ] Upload demo house photos (7.5).
- [ ] Add the `Roles` helper (8.2).
- [ ] Add `phone` and `phoneVisible` to `GET /api/me` (10.2).
- [ ] Frontend: route the landlord pages and connect the services to the backend.
- [ ] VLM pipeline: read photo columns as bucket paths and build URLs as in 7.1.
