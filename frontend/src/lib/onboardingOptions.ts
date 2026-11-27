// Options for the onboarding forms, matched to the Supabase schema.
//
// Enum `value`s must match the Postgres enum labels exactly. The schema we were given
// only shows them as USER-DEFINED, so the values marked "check with backend" are our
// best guess. If one is wrong, change it here and nothing else needs to move.

export type Option<T extends string | number | boolean = string> = { value: T; label: string }

export const AREAS = [
  "Bishopstown",
  "Blackrock",
  "College Road",
  "Douglas",
  "Shandon",
  "The Lough",
  "Victoria Cross",
  "Wilton",
]
export const AREA_OPTIONS: Option[] = AREAS.map((area) => ({ value: area, label: area }))

// Check with backend: room_type enum
export const ROOM_TYPES: Option[] = [
  { value: "single", label: "Single room" },
  { value: "double", label: "Double room" },
  { value: "ensuite", label: "En-suite" },
]

// tenant_house_preferences.lease_months, landlord/house min_lease_months
export const LEASE_MONTHS: Option<number>[] = [
  { value: 3, label: "3 months" },
  { value: 5, label: "Semester (5 months)" },
  { value: 9, label: "Academic year (9 months)" },
  { value: 12, label: "12 months" },
]

// tenant_house_preferences.max_housemates
export const HOUSEMATES: Option<number>[] = [1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: n === 5 ? "5+" : String(n),
}))

// Check with backend: sleep_schedule enum
export const SLEEP_SCHEDULES: Option[] = [
  { value: "early_bird", label: "Early bird" },
  { value: "night_owl", label: "Night owl" },
]

// Check with backend: cleanliness enum
export const CLEANLINESS: Option[] = [
  { value: "very_tidy", label: "Very tidy" },
  { value: "tidy", label: "Tidy" },
  { value: "relaxed", label: "Relaxed" },
]

// tenant_lifestyle_preferences.noise_tolerance is 1–5
export const NOISE_TOLERANCE: Option<number>[] = [
  { value: 1, label: "1 · I need quiet" },
  { value: 2, label: "2" },
  { value: 3, label: "3 · Some noise is fine" },
  { value: 4, label: "4" },
  { value: 5, label: "5 · Doesn't bother me" },
]

// Check with backend: work_schedule enum
export const WORK_SCHEDULES: Option[] = [
  { value: "on_campus", label: "Mostly on campus" },
  { value: "from_home", label: "Mostly at home" },
  { value: "mixed", label: "Mix of both" },
  { value: "night_shifts", label: "Night shifts" },
]

// Check with backend: social_level enum
export const SOCIAL_LEVELS: Option[] = [
  { value: "homebody", label: "Homebody" },
  { value: "balanced", label: "In between" },
  { value: "social", label: "Very social" },
]

// Check with backend: guest_frequency enum
export const GUEST_FREQUENCY: Option[] = [
  { value: "rarely", label: "Rarely" },
  { value: "weekends", label: "Weekends" },
  { value: "often", label: "Often" },
]

export const YES_NO: Option<boolean>[] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
]

export const INTERESTS = [
  "Cooking",
  "Hiking",
  "Gym",
  "Reading",
  "Gaming",
  "Music",
  "Coffee",
  "Board games",
  "Sports",
  "Movies",
]

// Mirrors the prompts table (prompt_id, text). Seed the table with the same ids.
export const PROMPTS: Option<number>[] = [
  "My ideal Friday night is…",
  "The one house rule I'd never break…",
  "You'll find me in the kitchen making…",
  "My biggest pet peeve in a shared house…",
  "On a lazy Sunday I'm usually…",
  "The best way to win me over is…",
  "I'm studying / working on…",
  "A small thing that makes my day…",
  "My go-to way to sort out a disagreement…",
  "Something I'm weirdly good at…",
].map((label, index) => ({ value: index + 1, label }))

// Mirrors the amenities table (name).
export const AMENITIES = [
  "WiFi",
  "Bills included",
  "Central heating",
  "Kitchen access",
  "Washing machine",
  "Dryer",
  "Dishwasher",
  "Study desk",
  "Double bed",
  "En-suite",
  "Garden",
  "Balcony",
  "Parking",
  "Bike storage",
  "Lift",
]

export const GUEST_POLICIES: Option[] = [
  { value: "no_overnight", label: "No overnight guests" },
  { value: "weekends", label: "Guests on weekends" },
  { value: "welcome", label: "Guests welcome" },
]

// Check with backend: tenant_type enum ('any' is confirmed by the column default)
export const TENANT_TYPES: Option[] = [
  { value: "any", label: "Anyone" },
  { value: "student", label: "Students" },
  { value: "professional", label: "Professionals" },
]

// house_preferences.quiet_hours_start / quiet_hours_end, stored as "HH:MM"
export const QUIET_START: Option[] = [
  { value: "21:00", label: "9pm" },
  { value: "22:00", label: "10pm" },
  { value: "23:00", label: "11pm" },
  { value: "00:00", label: "Midnight" },
]
export const QUIET_END: Option[] = [
  { value: "07:00", label: "7am" },
  { value: "08:00", label: "8am" },
  { value: "09:00", label: "9am" },
]

// landlord_preferences.min_lease_months and house_preferences.min_lease_months (default 1)
export const MIN_LEASE: Option<number>[] = [{ value: 1, label: "No minimum" }, ...LEASE_MONTHS]

// Sliders and fields with a database default need a starting value before they're touched.
export const tenantDefaults = { budgetMin: 500, budgetMax: 900, photoCount: 0 }
export const landlordDefaults = {
  photoCount: 0,
  preferredTenants: "any",
  minLeaseMonths: 1,
  referencesRequired: false,
  rent: 750,
  roomsAvailable: 1,
  houseMinLeaseMonths: 1,
  maxOccupants: 4,
  housePhotoCount: 0,
}

export const RENT_MIN = 300
export const RENT_MAX = 3000
export const ROOMS_MIN = 1
export const ROOMS_MAX = 10
export const OCCUPANTS_MIN = 1
export const OCCUPANTS_MAX = 12
export const AGE_MIN = 16
export const AGE_MAX = 100

export const BUDGET_FLOOR = 300
export const BUDGET_CEILING = 1500
export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 500
export const BIO_MAX = 300
export const RULES_MAX = 300
export const MAX_INTERESTS = 6
export const PROMPTS_REQUIRED = 3
export const PROMPT_MAX_LENGTH = 150
export const MAX_PHOTOS = 6
export const MAX_PHOTO_MB = 5

// Turns a stored value back into what the user saw, e.g. "night_owl" → "Night owl".
export function labelOf<T extends string | number | boolean>(options: Option<T>[], value?: T) {
  return options.find((option) => option.value === value)?.label ?? ""
}

export function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}
