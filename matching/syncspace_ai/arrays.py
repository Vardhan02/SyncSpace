"""
Turn lists of TenantProfile / House into numpy arrays, so the rules and the models can
score one tenant against thousands of candidates at once (same code for the API and for
training).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .schema import (AREAS, AMENITIES, CLEANLINESS, GUEST_FREQUENCIES, GUEST_POLICIES,
                     PREFERRED_TENANTS, QUIET_HOURS_STARTS, ROOM_TYPES, SLEEP_SCHEDULES,
                     SOCIAL_LEVELS, WORK_SCHEDULES, House, TenantProfile)

_AREA_IDX = {a: i for i, a in enumerate(AREAS)}
_AMENITY_IDX = {a: i for i, a in enumerate(AMENITIES)}


def _idx(values: list, value) -> int:
    return values.index(value)


@dataclass
class TenantArrays:
    ids: list[str]
    budget_min: np.ndarray
    budget_max: np.ndarray
    areas: np.ndarray            # (n, len(AREAS)) bool
    room: np.ndarray             # index into ROOM_TYPES (single < double < ensuite)
    move_in: np.ndarray          # date ordinal
    lease: np.ndarray            # months
    max_housemates: np.ndarray
    sleep: np.ndarray            # index into SLEEP_SCHEDULES
    noise: np.ndarray            # 1-5
    clean: np.ndarray            # 0 very_tidy, 1 tidy, 2 relaxed
    work: np.ndarray
    social: np.ndarray           # 0 homebody, 1 balanced, 2 social
    guests: np.ndarray           # 0 rarely, 1 weekends, 2 often
    smoker: np.ndarray
    ok_smoke: np.ndarray
    pets: np.ndarray
    ok_pets: np.ndarray
    is_student: np.ndarray
    age: np.ndarray
    interests: list[frozenset]

    def __len__(self) -> int:
        return len(self.ids)


@dataclass
class HouseArrays:
    ids: list[str]
    area: np.ndarray
    rent: np.ndarray
    rooms_available: np.ndarray
    room: np.ndarray
    available_from: np.ndarray   # date ordinal
    amenities: np.ndarray        # (m, len(AMENITIES)) bool
    pets_allowed: np.ndarray
    smoking_allowed: np.ndarray
    guest_policy: np.ndarray     # 0 no_overnight, 1 weekends, 2 welcome
    quiet_start: np.ndarray      # index into QUIET_HOURS_STARTS (0 = none)
    min_lease: np.ndarray
    max_occupants: np.ndarray
    preferred_tenants: np.ndarray

    def __len__(self) -> int:
        return len(self.ids)


def tenant_arrays(tenants: list[TenantProfile]) -> TenantArrays:
    areas = np.zeros((len(tenants), len(AREAS)), dtype=bool)
    for i, t in enumerate(tenants):
        for a in t.preferred_areas:
            areas[i, _AREA_IDX[a]] = True
    arr = lambda f, dt=np.int64: np.array([f(t) for t in tenants], dtype=dt)
    return TenantArrays(
        ids=[t.tenant_id for t in tenants],
        budget_min=arr(lambda t: t.budget_min),
        budget_max=arr(lambda t: t.budget_max),
        areas=areas,
        room=arr(lambda t: _idx(ROOM_TYPES, t.room_type)),
        move_in=arr(lambda t: t.move_in_date.toordinal()),
        lease=arr(lambda t: t.lease_months),
        max_housemates=arr(lambda t: t.max_housemates),
        sleep=arr(lambda t: _idx(SLEEP_SCHEDULES, t.sleep_schedule)),
        noise=arr(lambda t: t.noise_tolerance),
        clean=arr(lambda t: _idx(CLEANLINESS, t.cleanliness)),
        work=arr(lambda t: _idx(WORK_SCHEDULES, t.work_schedule)),
        social=arr(lambda t: _idx(SOCIAL_LEVELS, t.social_level)),
        guests=arr(lambda t: _idx(GUEST_FREQUENCIES, t.guest_frequency)),
        smoker=arr(lambda t: t.smoker, bool),
        ok_smoke=arr(lambda t: t.ok_with_smoking, bool),
        pets=arr(lambda t: t.has_pets, bool),
        ok_pets=arr(lambda t: t.ok_with_pets, bool),
        is_student=arr(lambda t: bool(t.university and t.university.strip()), bool),
        age=arr(lambda t: t.age or 22),
        interests=[frozenset(i.lower() for i in t.interests) for t in tenants],
    )


def house_arrays(houses: list[House]) -> HouseArrays:
    amen = np.zeros((len(houses), len(AMENITIES)), dtype=bool)
    for i, h in enumerate(houses):
        for a in h.amenities:
            amen[i, _AMENITY_IDX[a]] = True
    arr = lambda f, dt=np.int64: np.array([f(h) for h in houses], dtype=dt)
    return HouseArrays(
        ids=[h.house_id for h in houses],
        area=arr(lambda h: _AREA_IDX[h.area]),
        rent=arr(lambda h: h.rent),
        rooms_available=arr(lambda h: h.rooms_available),
        room=arr(lambda h: _idx(ROOM_TYPES, h.room_type)),
        available_from=arr(lambda h: h.available_from.toordinal()),
        amenities=amen,
        pets_allowed=arr(lambda h: h.pets_allowed, bool),
        smoking_allowed=arr(lambda h: h.smoking_allowed, bool),
        guest_policy=arr(lambda h: _idx(GUEST_POLICIES, h.guest_policy)),
        quiet_start=arr(lambda h: QUIET_HOURS_STARTS.index(h.quiet_hours_start)),
        min_lease=arr(lambda h: h.min_lease_months),
        max_occupants=arr(lambda h: h.max_occupants),
        preferred_tenants=arr(lambda h: _idx(PREFERRED_TENANTS, h.preferred_tenants)),
    )
