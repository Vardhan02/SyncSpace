# Matching service API

For the backend. This ranks the Houses grid and the Roommate swipe deck for a tenant.
It doesn't connect to the database, the backend sends it the rows and gets them back
sorted with a score.

```
Frontend ──> Backend (Spring Boot) ──> Supabase
                    │
                    └──> Matching service (this, Python)  POST /rank/houses
                                                          POST /rank/roommates
```

## Run it

```bash
cd matching
pip install -r requirements.txt
python train.py                                   # only once, ~1 min, creates artifacts/
uvicorn syncspace_ai.api:app --port 8001
```

- docs page: http://localhost:8001/docs
- `GET /health` gives `"mode": "hybrid"` if the models loaded, or `"rules"` if artifacts/
  is missing (ranking still works, just without the models)
- env vars: `SYNCSPACE_ARTIFACTS` (model folder), `SYNCSPACE_CORS_ORIGINS` (comma separated, default `*`)

## When to call it

| Screen | Call | Send |
|---|---|---|
| Houses tab | `POST /rank/houses` | the tenant + all active listings |
| Roommate tab (swipe deck) | `POST /rank/roommates` | the tenant + other tenants who finished onboarding and haven't been swiped on yet |

Call it again when the tenant changes their preferences. You can cache the results until
then. Around 2000 candidates per call is fine. The first call for a new tenant is a bit
slower because their text gets embedded (it's cached after that).

## Building the request from Supabase

Field names are the same as the Supabase columns. Join the tables and flatten:

Tenant (one object per tenant):
- `tenants`: `tenant_id`, `age`, `university`, `course`, `bio`
- `tenant_house_preferences`: `budget_min`, `budget_max`, `preferred_areas`, `room_type`,
  `move_in_date`, `lease_months`, `max_housemates`
- `tenant_lifestyle_preferences`: `sleep_schedule`, `noise_tolerance`, `cleanliness`,
  `work_schedule`, `social_level`, `guest_frequency`, `smoker`, `ok_with_smoking`, `has_pets`,
  `ok_with_pets`
- `tenant_interests`: `interests` as a list of strings
- `tenant_prompt_answers`: `prompt_answers` as a list of `{prompt_id, answer, slot}`

House (one object per listing):
- `houses`: `house_id`, `area`, `rent`, `rooms_available`, `room_type`, `available_from`
- `house_amenities`: `amenities` as a list of amenity names
- `house_preferences`: `pets_allowed`, `smoking_allowed`, `guest_policy`, `quiet_hours_start`,
  `min_lease_months`, `max_occupants`
- `landlord_preferences`: `preferred_tenants` (optional, default `any`)

Extra columns are ignored so you can send whole rows. `GET /schema` lists all allowed values.

### Allowed values

| Field | Values |
|---|---|
| `preferred_areas`, `area` | Bishopstown, Blackrock, College Road, Douglas, Shandon, The Lough, Victoria Cross, Wilton |
| `room_type` | `single`, `double`, `ensuite` |
| `lease_months` (tenant) | 3, 5, 9, 12 |
| `min_lease_months` (house) | 1, 3, 5, 9, 12 |
| `sleep_schedule` | `early_bird`, `night_owl` |
| `noise_tolerance` | 1-5 (1 = needs quiet) |
| `cleanliness` | `very_tidy`, `tidy`, `relaxed` |
| `work_schedule` | `on_campus`, `from_home`, `mixed`, `night_shifts` |
| `social_level` | `homebody`, `balanced`, `social` |
| `guest_frequency` | `rarely`, `weekends`, `often` |
| `guest_policy` | `no_overnight`, `weekends`, `welcome` |
| `quiet_hours_start` | `null`, `21:00`, `22:00`, `23:00`, `00:00` |
| `preferred_tenants` | `any`, `student`, `professional` |
| `amenities` | WiFi, Bills included, Central heating, Kitchen access, Washing machine, Dryer, Dishwasher, Study desk, Double bed, En-suite, Garden, Balcony, Parking, Bike storage, Lift |

These match the enums in the onboarding_values migration. If the DB changes, let me know,
it's one edit in `syncspace_ai/schema.py` and a retrain. A wrong value gives a 422 with the
field name.

## `POST /rank/roommates`

Full example: [`examples/rank_roommates.json`](examples/rank_roommates.json).

```json
{
  "tenant":     { "tenant_id": "tenant-36", "budget_min": 580, "...": "..." },
  "candidates": [ { "tenant_id": "tenant-2", "...": "..." } ],
  "limit": 50
}
```

If the tenant is also in `candidates` it gets skipped.

## `POST /rank/houses`

Full example: [`examples/rank_houses.json`](examples/rank_houses.json).

```json
{
  "tenant": { "tenant_id": "tenant-36", "...": "..." },
  "houses": [ { "house_id": "house-0", "area": "Douglas", "rent": 475, "...": "..." } ],
  "limit": 50
}
```

## Response (both endpoints)

```json
{
  "tenant_id": "tenant-36",
  "mode": "hybrid",
  "results": [
    {
      "id": "house-2",
      "score": 96,
      "reasons": ["€577/month, within your €820 budget", "In Douglas, one of your areas",
                  "Single room, as you wanted", "Available by your move-in date"],
      "cautions": []
    }
  ],
  "filtered_out": [
    { "id": "house-1", "reason": "More housemates than wanted" }
  ]
}
```

- `results` is sorted best first, just show it in that order (first = top-left card)
- `score` (0-100) is the "% match". It's a percentile, so 94 = better than 94% of the pairs
  that pass the filters
- `reasons` / `cautions` are optional text for the cards
- `filtered_out` = dealbreakers (budget, smoking, pets, lease, room type, move-in,
  housemates), don't show these
- a candidate or house with missing/invalid fields doesn't fail the request, it just shows
  up in `filtered_out` as "Incomplete or invalid profile (field)". Best to only send tenants
  with `onboarding_complete = true`
- `house_id` can be a number, `quiet_hours_start` can be "23:00" or "23:00:00", odd times
  get rounded to the nearest option, unknown areas in `preferred_areas` are ignored

## Errors

| Code | Meaning |
|---|---|
| 422 | the main `tenant` has a missing field or a value that's not allowed (the response says which field) |
| 500 | bug on my side, send me the request body |
