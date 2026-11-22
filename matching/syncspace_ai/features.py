"""Numeric feature vectors for the neural towers."""
from __future__ import annotations

import numpy as np

from .arrays import HouseArrays, TenantArrays
from .schema import (AREAS, CLEANLINESS, GUEST_FREQUENCIES, GUEST_POLICIES,
                     PREFERRED_TENANTS, QUIET_HOURS_STARTS, ROOM_TYPES, SLEEP_SCHEDULES,
                     SOCIAL_LEVELS, WORK_SCHEDULES)
from .text import TEXT_DIM


def _onehot(idx: np.ndarray, n: int) -> np.ndarray:
    out = np.zeros((len(idx), n), dtype=np.float32)
    out[np.arange(len(idx)), idx] = 1
    return out


def tenant_features(T: TenantArrays, text: np.ndarray, today_ord: int) -> np.ndarray:
    """(n, TENANT_DIM). `text` is (n, 384) from TextEncoder (zeros if no text)."""
    f = lambda x: np.asarray(x, dtype=np.float32)[:, None]
    numeric = np.hstack([
        f(T.budget_min / 1500), f(T.budget_max / 1500),
        f(np.clip((T.move_in - today_ord) / 180, -1, 2)),
        f(T.lease / 12), f(T.max_housemates / 5), f((T.noise - 1) / 4),
        f(np.clip((T.age - 18) / 20, 0, 2)),
        f(T.smoker), f(T.ok_smoke), f(T.pets), f(T.ok_pets), f(T.is_student),
        f(np.abs(text).sum(1) > 0),
    ])
    return np.hstack([
        T.areas.astype(np.float32),
        _onehot(T.room, len(ROOM_TYPES)),
        _onehot(T.sleep, len(SLEEP_SCHEDULES)),
        _onehot(T.clean, len(CLEANLINESS)),
        _onehot(T.work, len(WORK_SCHEDULES)),
        _onehot(T.social, len(SOCIAL_LEVELS)),
        _onehot(T.guests, len(GUEST_FREQUENCIES)),
        numeric,
        text.astype(np.float32),
    ])


def house_features(H: HouseArrays, today_ord: int) -> np.ndarray:
    f = lambda x: np.asarray(x, dtype=np.float32)[:, None]
    return np.hstack([
        _onehot(H.area, len(AREAS)),
        _onehot(H.room, len(ROOM_TYPES)),
        f(H.rent / 1500), f(H.rooms_available / 10),
        f(np.clip((H.available_from - today_ord) / 180, -1, 2)),
        H.amenities.astype(np.float32),
        f(H.pets_allowed), f(H.smoking_allowed),
        _onehot(H.guest_policy, len(GUEST_POLICIES)),
        _onehot(H.quiet_start, len(QUIET_HOURS_STARTS)),
        f(H.min_lease / 12), f(H.max_occupants / 12),
        _onehot(H.preferred_tenants, len(PREFERRED_TENANTS)),
    ])


TENANT_DIM = len(AREAS) + len(ROOM_TYPES) + len(SLEEP_SCHEDULES) + len(CLEANLINESS) + \
    len(WORK_SCHEDULES) + len(SOCIAL_LEVELS) + len(GUEST_FREQUENCIES) + 13 + TEXT_DIM
HOUSE_DIM = len(AREAS) + len(ROOM_TYPES) + 3 + 15 + 2 + len(GUEST_POLICIES) + \
    len(QUIET_HOURS_STARTS) + 2 + len(PREFERRED_TENANTS)
