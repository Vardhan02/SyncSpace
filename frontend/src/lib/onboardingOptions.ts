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

export const ROOM_TYPES = ["Single room", "Double room", "En-suite"]

export const LEASE_LENGTHS = [
  "Semester (4–5 months)",
  "Academic year (9 months)",
  "12 months",
  "Flexible",
]

export const HOUSEMATES = ["1", "2", "3", "4+"]

export const SLEEP_SCHEDULES = ["Early bird", "Night owl"]
export const CLEANLINESS = ["Very tidy", "Tidy", "Average"]
export const NOISE_TOLERANCE = ["I need quiet", "Some noise is fine", "Doesn't bother me"]
export const STUDY_PATTERNS = ["Mostly on campus", "Mostly at home", "Mix of both", "Night shifts"]
export const SOCIAL_STYLES = ["Homebody", "In between", "Very social"]
export const GUEST_FREQUENCY = ["Rarely", "Weekends", "Often"]
export const SMOKING = ["Non-smoker", "Smoke outside only", "Smoker"]
export const PETS = ["No pets", "I have a pet", "Fine with pets"]

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

export const PROMPTS = [
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
]

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

export const PET_POLICIES = ["No pets", "Small pets OK", "Pets allowed"]
export const SMOKING_POLICIES = ["No smoking", "Smoking outside only"]
export const GUEST_POLICIES = ["No overnight guests", "Guests on weekends", "Guests welcome"]
export const QUIET_HOURS = ["No quiet hours", "Quiet after 10pm", "Quiet after 11pm"]

export const RENT_MIN = 300
export const RENT_MAX = 3000
export const ROOMS_MIN = 1
export const ROOMS_MAX = 10

// The rent and rooms sliders need a starting position before the landlord touches them.
export const listingDefaults = { rent: 750, rooms: 1 }

export const BUDGET_FLOOR = 300
export const BUDGET_CEILING = 1500
export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 500
export const RULES_MAX = 300
export const MAX_INTERESTS = 6
export const PROMPTS_REQUIRED = 3
export const PROMPT_MAX_LENGTH = 150
export const MAX_PHOTOS = 10
export const MAX_PHOTO_MB = 5

export function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}
