# Convert lists of tenants / houses into numpy arrays so we can score
# one tenant against thousands of candidates at once.

from dataclasses import dataclass

import numpy as np

from .schema import (AREAS, AMENITIES, CLEANLINESS, GUEST_FREQUENCIES, GUEST_POLICIES,
                     PREFERRED_TENANTS, QUIET_HOURS_STARTS, ROOM_TYPES, SLEEP_SCHEDULES,
                     SOCIAL_LEVELS, WORK_SCHEDULES)

AREA_IDX = {a: i for i, a in enumerate(AREAS)}
AMENITY_IDX = {a: i for i, a in enumerate(AMENITIES)}


@dataclass
class TenantArrays:
    ids: list
    budget_min: np.ndarray
    budget_max: np.ndarray
    areas: np.ndarray        # (n, num areas) bool
    room: np.ndarray         # single < double < ensuite
    move_in: np.ndarray      # date as ordinal
    lease: np.ndarray
    max_housemates: np.ndarray
    sleep: np.ndarray
    noise: np.ndarray        # 1-5
    clean: np.ndarray        # 0 very_tidy, 1 tidy, 2 relaxed
    work: np.ndarray
    social: np.ndarray       # 0 homebody, 1 balanced, 2 social
    guests: np.ndarray       # 0 rarely, 1 weekends, 2 often
    smoker: np.ndarray
    ok_smoke: np.ndarray
    pets: np.ndarray
    ok_pets: np.ndarray
    is_student: np.ndarray
    age: np.ndarray
    interests: list

    def __len__(self):
        return len(self.ids)


@dataclass
class HouseArrays:
    ids: list
    area: np.ndarray
    rent: np.ndarray
    rooms_available: np.ndarray
    room: np.ndarray
    available_from: np.ndarray
    amenities: np.ndarray      # (m, num amenities) bool
    pets_allowed: np.ndarray
    smoking_allowed: np.ndarray
    guest_policy: np.ndarray   # 0 no_overnight, 1 weekends, 2 welcome
    quiet_start: np.ndarray    # 0 = no quiet hours
    min_lease: np.ndarray
    max_occupants: np.ndarray
    preferred_tenants: np.ndarray

    def __len__(self):
        return len(self.ids)


def ints(values):
    return np.array(values, dtype=np.int64)


def bools(values):
    return np.array(values, dtype=bool)


def tenant_arrays(tenants):
    areas = np.zeros((len(tenants), len(AREAS)), dtype=bool)
    for i, t in enumerate(tenants):
        for a in t.preferred_areas:
            areas[i, AREA_IDX[a]] = True

    return TenantArrays(
        ids=[t.tenant_id for t in tenants],
        budget_min=ints([t.budget_min for t in tenants]),
        budget_max=ints([t.budget_max for t in tenants]),
        areas=areas,
        room=ints([ROOM_TYPES.index(t.room_type) for t in tenants]),
        move_in=ints([t.move_in_date.toordinal() for t in tenants]),
        lease=ints([t.lease_months for t in tenants]),
        max_housemates=ints([t.max_housemates for t in tenants]),
        sleep=ints([SLEEP_SCHEDULES.index(t.sleep_schedule) for t in tenants]),
        noise=ints([t.noise_tolerance for t in tenants]),
        clean=ints([CLEANLINESS.index(t.cleanliness) for t in tenants]),
        work=ints([WORK_SCHEDULES.index(t.work_schedule) for t in tenants]),
        social=ints([SOCIAL_LEVELS.index(t.social_level) for t in tenants]),
        guests=ints([GUEST_FREQUENCIES.index(t.guest_frequency) for t in tenants]),
        smoker=bools([t.smoker for t in tenants]),
        ok_smoke=bools([t.ok_with_smoking for t in tenants]),
        pets=bools([t.has_pets for t in tenants]),
        ok_pets=bools([t.ok_with_pets for t in tenants]),
        is_student=bools([bool(t.university and t.university.strip()) for t in tenants]),
        age=ints([t.age or 22 for t in tenants]),   # 22 if not given
        interests=[frozenset(i.lower() for i in t.interests) for t in tenants],
    )


def house_arrays(houses):
    amen = np.zeros((len(houses), len(AMENITIES)), dtype=bool)
    for i, h in enumerate(houses):
        for a in h.amenities:
            amen[i, AMENITY_IDX[a]] = True

    return HouseArrays(
        ids=[h.house_id for h in houses],
        area=ints([AREA_IDX[h.area] for h in houses]),
        rent=ints([h.rent for h in houses]),
        rooms_available=ints([h.rooms_available for h in houses]),
        room=ints([ROOM_TYPES.index(h.room_type) for h in houses]),
        available_from=ints([h.available_from.toordinal() for h in houses]),
        amenities=amen,
        pets_allowed=bools([h.pets_allowed for h in houses]),
        smoking_allowed=bools([h.smoking_allowed for h in houses]),
        guest_policy=ints([GUEST_POLICIES.index(h.guest_policy) for h in houses]),
        quiet_start=ints([QUIET_HOURS_STARTS.index(h.quiet_hours_start) for h in houses]),
        min_lease=ints([h.min_lease_months for h in houses]),
        max_occupants=ints([h.max_occupants for h in houses]),
        preferred_tenants=ints([PREFERRED_TENANTS.index(h.preferred_tenants) for h in houses]),
    )
