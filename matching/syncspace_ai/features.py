# Feature vectors that go into the two-tower models

import numpy as np

from .schema import (AREAS, CLEANLINESS, GUEST_FREQUENCIES, GUEST_POLICIES,
                     PREFERRED_TENANTS, QUIET_HOURS_STARTS, ROOM_TYPES, SLEEP_SCHEDULES,
                     SOCIAL_LEVELS, WORK_SCHEDULES)
from .text import TEXT_DIM


def onehot(idx, n):
    out = np.zeros((len(idx), n), dtype=np.float32)
    out[np.arange(len(idx)), idx] = 1
    return out


def column(x):
    return np.asarray(x, dtype=np.float32)[:, None]


def tenant_features(T, text, today_ord):
    # text = (n, 384) sentence embeddings, all zeros if the tenant wrote nothing
    numeric = np.hstack([
        column(T.budget_min / 1500),
        column(T.budget_max / 1500),
        column(np.clip((T.move_in - today_ord) / 180, -1, 2)),
        column(T.lease / 12),
        column(T.max_housemates / 5),
        column((T.noise - 1) / 4),
        column(np.clip((T.age - 18) / 20, 0, 2)),
        column(T.smoker),
        column(T.ok_smoke),
        column(T.pets),
        column(T.ok_pets),
        column(T.is_student),
        column(np.abs(text).sum(1) > 0),   # has text or not
    ])
    return np.hstack([
        T.areas.astype(np.float32),
        onehot(T.room, len(ROOM_TYPES)),
        onehot(T.sleep, len(SLEEP_SCHEDULES)),
        onehot(T.clean, len(CLEANLINESS)),
        onehot(T.work, len(WORK_SCHEDULES)),
        onehot(T.social, len(SOCIAL_LEVELS)),
        onehot(T.guests, len(GUEST_FREQUENCIES)),
        numeric,
        text.astype(np.float32),
    ])


def house_features(H, today_ord):
    return np.hstack([
        onehot(H.area, len(AREAS)),
        onehot(H.room, len(ROOM_TYPES)),
        column(H.rent / 1500),
        column(H.rooms_available / 10),
        column(np.clip((H.available_from - today_ord) / 180, -1, 2)),
        H.amenities.astype(np.float32),
        column(H.pets_allowed),
        column(H.smoking_allowed),
        onehot(H.guest_policy, len(GUEST_POLICIES)),
        onehot(H.quiet_start, len(QUIET_HOURS_STARTS)),
        column(H.min_lease / 12),
        column(H.max_occupants / 12),
        onehot(H.preferred_tenants, len(PREFERRED_TENANTS)),
    ])


TENANT_DIM = (len(AREAS) + len(ROOM_TYPES) + len(SLEEP_SCHEDULES) + len(CLEANLINESS) +
              len(WORK_SCHEDULES) + len(SOCIAL_LEVELS) + len(GUEST_FREQUENCIES) + 13 + TEXT_DIM)
HOUSE_DIM = (len(AREAS) + len(ROOM_TYPES) + 3 + 15 + 2 + len(GUEST_POLICIES) +
             len(QUIET_HOURS_STARTS) + 2 + len(PREFERRED_TENANTS))
