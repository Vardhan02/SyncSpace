# Matching service API

For the backend. This service ranks the **Houses** grid and the **Roommate** swipe deck
for a tenant. It doesn't connect to the database: the backend sends it rows, and it returns
them in order with a score.

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
python train.py                                   # once, ~1 min; creates artifacts/
uvicorn syncspace_ai.api:app --port 8001
```

- Interactive docs: <http://localhost:8001/docs>
- `GET /health` returns `"mode": "hybrid"` when the models are loaded. It returns `"rules"` if
  `artifacts/` is missing; ranking still works then, just without the neural models.
- Environment variables:
  - `SYNCSPACE_ARTIFACTS`: path to the model folder.
  - `SYNCSPACE_CORS_ORIGINS`: comma-separated origins (default `*`).

## When to call it

| Screen | Call | Send |
|---|---|---|
| Houses tab | `POST /rank/houses` | the tenant + all active listings |
| Roommate tab (swipe deck) | `POST /rank/roommates` | the tenant + other tenants who finished onboarding and haven't been swiped on yet |

Call again after the tenant edits their preferences in Profile. Results can be cached until
something changes. Up to ~2,000 candidates per call is fine; the first call for a new
tenant is slower because their prompt answers are embedded once and then cached.

## Building the request from Supabase

Field names are the column names from Dhruvil's onboarding spec. Join and flatten:

**Tenant**: one object per tenant, built from:
- `tenants`: `tenant_id`, `age`, `university`, `course`, `bio`
- `tenant_house_preferences`: `budget_min`, `budget_max`, `preferred_areas`, `room_type`,
  `move_in_date`, `lease_months`, `max_housemates`
- `tenant_lifestyle_preferences`: `sleep_schedule`, `noise_tolerance`, `cleanliness`,
  `work_schedule`, `social_level`, `guest_frequency`, `smoker`, `ok_with_smoking`, `has_pets`,
  `ok_with_pets`
- `tenant_interests`: `interests` as a list of strings
- `tenant_prompt_answers`: `prompt_answers` as a list of `{prompt_id, answer, slot}`

**House**: one object per listing, built from:
- `houses`: `house_id`, `area`, `rent`, `rooms_available`, `room_type`, `available_from`
- `house_amenities`: `amenities` as a list of amenity names
- `house_preferences`: `pets_allowed`, `smoking_allowed`, `guest_policy`, `quiet_hours_start`,
  `min_lease_months`, `max_occupants`
- `landlord_preferences`: `preferred_tenants` (optional, default `any`)

Extra columns are ignored, so whole rows can be sent. `GET /schema` lists every allowed value.

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

> These are the values in Dhruvil's spec, which are still a guess at the real Postgres enums.
> If the database uses different ones, tell the AI side: the fix is one edit in
> `syncspace_ai/schema.py` and a retrain. A wrong value returns **422** with the field name.

## `POST /rank/roommates`

Full example: [`examples/rank_roommates.json`](examples/rank_roommates.json).

```json
{
  "tenant":     { "tenant_id": "tenant-36", "budget_min": 580, "...": "..." },
  "candidates": [ { "tenant_id": "tenant-2", "...": "..." } ],
  "limit": 50
}
```

The tenant is automatically left out if it also appears in `candidates`.

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

- `results` is already sorted best first. Show it in this order; on the Houses grid the
  first item is the top-left card.
- `score` (0–100) is the number to show as "% match". It's a percentile: 94 means a better
  match than 94% of pairs that pass the dealbreakers.
- `reasons` and `cautions` are short strings the cards can show (optional).
- `filtered_out` lists dealbreakers (budget, smoking, pets, lease, room type, move-in date,
  housemates). Don't show these on the Houses grid or in the swipe deck.

## Errors

| Code | Meaning |
|---|---|
| 422 | A field is missing or has a value outside the allowed list; the body names the field |
| 500 | Bug on our side; please send us the request body |
