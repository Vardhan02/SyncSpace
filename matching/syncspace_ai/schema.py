# All fields and allowed values the matching service accepts.
# Names match the Supabase columns (from Dhruvil's onboarding spec) so the backend
# can pass rows straight in. If an enum changes in the DB, change it here and retrain.

from datetime import date
from typing import Literal, Optional, get_args

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SCHEMA_VERSION = "2026-11-22"

# allowed values
Area = Literal[
    "Bishopstown", "Blackrock", "College Road", "Douglas",
    "Shandon", "The Lough", "Victoria Cross", "Wilton",
]
RoomType = Literal["single", "double", "ensuite"]
SleepSchedule = Literal["early_bird", "night_owl"]
Cleanliness = Literal["very_tidy", "tidy", "relaxed"]
WorkSchedule = Literal["on_campus", "from_home", "mixed", "night_shifts"]
SocialLevel = Literal["homebody", "balanced", "social"]
GuestFrequency = Literal["rarely", "weekends", "often"]
GuestPolicy = Literal["no_overnight", "weekends", "welcome"]
PreferredTenants = Literal["any", "student", "professional"]
Amenity = Literal[
    "WiFi", "Bills included", "Central heating", "Kitchen access", "Washing machine",
    "Dryer", "Dishwasher", "Study desk", "Double bed", "En-suite", "Garden", "Balcony",
    "Parking", "Bike storage", "Lift",
]
QuietHoursStart = Literal["21:00", "22:00", "23:00", "00:00"]

AREAS = list(get_args(Area))
ROOM_TYPES = list(get_args(RoomType))
SLEEP_SCHEDULES = list(get_args(SleepSchedule))
CLEANLINESS = list(get_args(Cleanliness))
WORK_SCHEDULES = list(get_args(WorkSchedule))
SOCIAL_LEVELS = list(get_args(SocialLevel))
GUEST_FREQUENCIES = list(get_args(GuestFrequency))
GUEST_POLICIES = list(get_args(GuestPolicy))
PREFERRED_TENANTS = list(get_args(PreferredTenants))
AMENITIES = list(get_args(Amenity))
QUIET_HOURS_STARTS = [None, *get_args(QuietHoursStart)]   # None = no quiet hours

TENANT_LEASE_MONTHS = [3, 5, 9, 12]
LANDLORD_MIN_LEASE_MONTHS = [1, 3, 5, 9, 12]
BUDGET_FLOOR, BUDGET_CEILING = 300, 1500
RENT_MIN, RENT_MAX = 300, 3000
MAX_HOUSEMATES = 5
MAX_OCCUPANTS = 12
NOISE_MIN, NOISE_MAX = 1, 5   # 1 = needs quiet, 5 = doesn't care
MAX_INTERESTS = 6
PROMPTS_REQUIRED = 3
PROMPT_MAX_LENGTH = 150


# request / response models

class PromptAnswer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    prompt_id: int = Field(ge=1, le=10)
    answer: str = Field(min_length=1, max_length=PROMPT_MAX_LENGTH)
    slot: Optional[int] = Field(default=None, ge=1, le=3)


class TenantProfile(BaseModel):
    # everything from tenant onboarding, joined from the tenant tables
    model_config = ConfigDict(extra="ignore")

    tenant_id: str
    # tenants
    age: Optional[int] = Field(default=None, ge=16, le=100)
    university: Optional[str] = None
    course: Optional[str] = None
    bio: str = ""
    # tenant_house_preferences
    budget_min: int = Field(ge=BUDGET_FLOOR, le=BUDGET_CEILING)
    budget_max: int = Field(ge=BUDGET_FLOOR, le=BUDGET_CEILING)
    preferred_areas: list[Area] = Field(min_length=1)
    room_type: RoomType
    move_in_date: date
    lease_months: Literal[3, 5, 9, 12]
    max_housemates: int = Field(ge=1, le=MAX_HOUSEMATES)
    # tenant_lifestyle_preferences
    sleep_schedule: SleepSchedule
    noise_tolerance: int = Field(ge=NOISE_MIN, le=NOISE_MAX)
    cleanliness: Cleanliness
    work_schedule: WorkSchedule
    social_level: SocialLevel
    guest_frequency: GuestFrequency
    smoker: bool
    ok_with_smoking: bool
    has_pets: bool
    ok_with_pets: bool
    # tenant_interests / tenant_prompt_answers
    interests: list[str] = Field(default_factory=list, max_length=MAX_INTERESTS)
    prompt_answers: list[PromptAnswer] = Field(default_factory=list, max_length=PROMPTS_REQUIRED)

    @field_validator("interests")
    @classmethod
    def clean_interests(cls, v):
        return [i.strip() for i in v if i and i.strip()]

    @model_validator(mode="after")
    def check_budget(self):
        if self.budget_min > self.budget_max:
            raise ValueError("budget_min must be <= budget_max")
        return self


class House(BaseModel):
    # a listing: houses + house_amenities + house_preferences
    model_config = ConfigDict(extra="ignore")

    house_id: str
    # houses
    area: Area
    rent: int = Field(ge=RENT_MIN, le=RENT_MAX)
    rooms_available: int = Field(ge=0, le=10)
    room_type: RoomType
    available_from: date
    # house_amenities
    amenities: list[Amenity] = Field(default_factory=list)
    # house_preferences
    pets_allowed: bool
    smoking_allowed: bool
    guest_policy: GuestPolicy
    quiet_hours_start: Optional[QuietHoursStart] = None
    min_lease_months: Literal[1, 3, 5, 9, 12] = 1
    max_occupants: int = Field(ge=1, le=MAX_OCCUPANTS)
    # landlord_preferences
    preferred_tenants: PreferredTenants = "any"

    @field_validator("quiet_hours_start", mode="before")
    @classmethod
    def blank_is_none(cls, v):
        return None if v in ("", "none", "None") else v


class RankRoommatesRequest(BaseModel):
    tenant: TenantProfile
    candidates: list[TenantProfile] = Field(max_length=2000)
    limit: Optional[int] = Field(default=None, ge=1)
    today: Optional[date] = None   # only for tests, normally uses today's date


class RankHousesRequest(BaseModel):
    tenant: TenantProfile
    houses: list[House] = Field(max_length=5000)
    limit: Optional[int] = Field(default=None, ge=1)
    today: Optional[date] = None


class RankedItem(BaseModel):
    id: str
    score: int = Field(description="0-100 match score, shown as % on the card")
    reasons: list[str]
    cautions: list[str]


class FilteredItem(BaseModel):
    id: str
    reason: str


class RankResponse(BaseModel):
    tenant_id: str
    mode: Literal["hybrid", "rules"]
    results: list[RankedItem]
    filtered_out: list[FilteredItem]


def schema_summary():
    # returned by GET /schema
    return {
        "schema_version": SCHEMA_VERSION,
        "areas": AREAS,
        "room_types": ROOM_TYPES,
        "sleep_schedules": SLEEP_SCHEDULES,
        "cleanliness": CLEANLINESS,
        "work_schedules": WORK_SCHEDULES,
        "social_levels": SOCIAL_LEVELS,
        "guest_frequencies": GUEST_FREQUENCIES,
        "guest_policies": GUEST_POLICIES,
        "preferred_tenants": PREFERRED_TENANTS,
        "amenities": AMENITIES,
        "quiet_hours_starts": QUIET_HOURS_STARTS,
        "tenant_lease_months": TENANT_LEASE_MONTHS,
        "landlord_min_lease_months": LANDLORD_MIN_LEASE_MONTHS,
        "budget_range": [BUDGET_FLOOR, BUDGET_CEILING],
        "rent_range": [RENT_MIN, RENT_MAX],
        "noise_tolerance_range": [NOISE_MIN, NOISE_MAX],
        "max_housemates": MAX_HOUSEMATES,
        "max_occupants": MAX_OCCUPANTS,
        "max_interests": MAX_INTERESTS,
        "prompts_required": PROMPTS_REQUIRED,
        "prompt_max_length": PROMPT_MAX_LENGTH,
    }
