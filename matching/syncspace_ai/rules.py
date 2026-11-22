"""
Hand-written compatibility rules. They do three jobs:

1. Hard filters: dealbreakers (over budget, smoker vs non-smoker, pets...). Anything that
   fails is removed before ranking, whatever the model thinks.
2. Rule score (0-1): a transparent weighted score, used as a model input to the final
   blend and as the fallback when the neural models are unavailable.
3. Reasons / cautions: short human-readable strings for the UI.

All scoring functions broadcast: pass n queries and m candidates, get (n, m) matrices.
"""
from __future__ import annotations

from datetime import date

import numpy as np

from .arrays import HouseArrays, TenantArrays
from .schema import (AMENITIES, QUIET_HOURS_STARTS, SLEEP_SCHEDULES, House,
                     TenantProfile)

col = lambda x: np.asarray(x)[:, None]
row = lambda x: np.asarray(x)[None, :]

# ================================================================ roommates
ROOMMATE_BUDGET_SLACK = 50          # € of non-overlap we still tolerate
ROOMMATE_FILTERS = [
    "ok",
    "Budgets don't overlap",
    "Smoking dealbreaker",
    "Pets dealbreaker",
]
ROOMMATE_WEIGHTS = {
    "sleep": 0.14, "clean": 0.14, "noise": 0.10, "social": 0.14, "guests": 0.08,
    "work": 0.05, "area": 0.12, "budget": 0.06, "move_in": 0.07, "interests": 0.10,
}
_STEP3 = np.array([1.0, 0.6, 0.15])   # score for an ordinal difference of 0, 1, 2


def roommate_hard_filter(A: TenantArrays, B: TenantArrays) -> np.ndarray:
    """(n, m) int array: 0 = compatible, otherwise index into ROOMMATE_FILTERS."""
    fail = np.zeros((len(A), len(B)), dtype=np.int8)
    budget = ((col(A.budget_max) + ROOMMATE_BUDGET_SLACK < row(B.budget_min)) |
              (row(B.budget_max) + ROOMMATE_BUDGET_SLACK < col(A.budget_min)))
    smoke = (col(A.smoker) & ~row(B.ok_smoke)) | (row(B.smoker) & ~col(A.ok_smoke))
    pets = (col(A.pets) & ~row(B.ok_pets)) | (row(B.pets) & ~col(A.ok_pets))
    for code, bad in reversed(list(enumerate([budget, smoke, pets], start=1))):
        fail[bad] = code          # reversed so the first rule wins
    return fail


def _interest_jaccard(A: TenantArrays, B: TenantArrays) -> np.ndarray:
    vocab = sorted(set().union(*A.interests, *B.interests))
    if not vocab:
        return np.full((len(A), len(B)), 0.5)
    hot =lambda sets: np.array([[v in s for v in vocab] for s in sets], dtype=np.float32)
    MA, MB = hot(A.interests), hot(B.interests)
    inter = MA @ MB.T
    union = MA.sum(1)[:, None] + MB.sum(1)[None, :] - inter
    j = np.divide(inter, union, out=np.zeros_like(inter), where=union > 0)
    empty = (MA.sum(1)[:, None] == 0) | (MB.sum(1)[None, :] == 0)
    return np.where(empty, 0.5, j)


def roommate_components(A: TenantArrays, B: TenantArrays) -> dict[str, np.ndarray]:
    diff = lambda x, y: np.abs(col(x) - row(y))
    work_a, work_b = col(A.work), row(B.work)
    night_a, night_b = work_a == 3, work_b == 3
    lo = np.maximum(col(A.budget_min), row(B.budget_min))
    hi = np.minimum(col(A.budget_max), row(B.budget_max))
    width = np.maximum(np.minimum(col(A.budget_max - A.budget_min), row(B.budget_max - B.budget_min)), 50)
    comps = {
        "sleep": np.where(col(A.sleep) == row(B.sleep), 1.0, 0.2),
        "clean": _STEP3[diff(A.clean, B.clean)],
        "noise": 1 - diff(A.noise, B.noise) / 4,
        "social": _STEP3[diff(A.social, B.social)],
        "guests": np.array([1.0, 0.6, 0.2])[diff(A.guests, B.guests)],
        "work": np.where(work_a == work_b, 1.0, np.where(night_a ^ night_b, 0.5, 0.75)),
        "area": (A.areas.astype(np.float32) @ B.areas.T.astype(np.float32) > 0).astype(float),
        "budget": np.clip((hi - lo) / width, 0, 1),
        "move_in": np.clip(1 - diff(A.move_in, B.move_in) / 60, 0, 1),
        "interests": _interest_jaccard(A, B),
    }
    return {k: v.astype(np.float32) for k, v in comps.items()}


def roommate_rule_score(A: TenantArrays, B: TenantArrays, comps=None) -> np.ndarray:
    comps = comps or roommate_components(A, B)
    return sum(w * comps[k] for k, w in ROOMMATE_WEIGHTS.items())


def roommate_explain(a: TenantProfile, b: TenantProfile, comps: dict[str, float]):
    """Reasons and cautions for one pair, from the component scores of that pair."""
    reasons, cautions = [], []
    if comps["sleep"] == 1:
        label = "early birds" if a.sleep_schedule == "early_bird" else "night owls"
        reasons.append(f"Both {label}")
    else:
        cautions.append("Different sleep schedules")
    if comps["clean"] == 1:
        reasons.append("Same cleanliness standards")
    elif comps["clean"] < 0.5:
        cautions.append("Very different cleanliness standards")
    if comps["social"] == 1:
        reasons.append({"homebody": "Both homebodies", "social": "Both very social"}
                       .get(a.social_level, "Similar social style"))
    elif comps["social"] < 0.5:
        cautions.append("Very different social styles")
    shared = sorted(set(i.lower() for i in a.interests) & set(i.lower() for i in b.interests))
    if shared:
        reasons.append("Both like " + ", ".join(s.title() for s in shared[:3]))
    common_areas = [x for x in a.preferred_areas if x in b.preferred_areas]
    if common_areas:
        reasons.append("Both looking in " + ", ".join(common_areas[:2]))
    else:
        cautions.append("No preferred area in common")
    if comps["noise"] <= 0.5:
        cautions.append("Different noise tolerance")
    if comps["guests"] <= 0.2:
        cautions.append("Different guest habits")
    if comps["move_in"] < 0.3:
        cautions.append("Move-in dates far apart")
    if not reasons:   # every pair that passes the filters has overlapping budgets
        lo, hi = max(a.budget_min, b.budget_min), min(a.budget_max, b.budget_max)
        reasons.append(f"Similar budgets (€{lo}–€{hi})" if lo <= hi else "Similar budgets")
    return reasons[:4], cautions[:2]


# ================================================================ houses
MOVE_IN_GRACE_DAYS = 30             # a house can free up this long after the tenant's move-in date
HOUSE_FILTERS = [
    "ok",
    "Over budget",
    "Smoking not allowed",
    "Pets not allowed",
    "Minimum lease longer than wanted",
    "Smaller room type than wanted",
    "Not available in time",
    "More housemates than wanted",
    "No rooms available",
]
HOUSE_WEIGHTS = {
    "budget": 0.25, "area": 0.25, "room": 0.12, "timing": 0.10,
    "lifestyle": 0.12, "tenant_pref": 0.06, "amenities": 0.10,
}
_BASE_WANTS = [AMENITIES.index(a) for a in ("WiFi", "Central heating", "Washing machine")]
_DESK = AMENITIES.index("Study desk")


def house_hard_filter(T: TenantArrays, H: HouseArrays) -> np.ndarray:
    checks = [
        row(H.rent) > col(T.budget_max),
        col(T.smoker) & ~row(H.smoking_allowed),
        col(T.pets) & ~row(H.pets_allowed),
        row(H.min_lease) > col(T.lease),
        row(H.room) < col(T.room),
        row(H.available_from) > col(T.move_in) + MOVE_IN_GRACE_DAYS,
        row(H.max_occupants) - 1 > col(T.max_housemates),
        np.broadcast_to(row(H.rooms_available) <= 0, (len(T), len(H))),
    ]
    fail = np.zeros((len(T), len(H)), dtype=np.int8)
    for code, bad in reversed(list(enumerate(checks, start=1))):
        fail[bad] = code
    return fail


def house_components(T: TenantArrays, H: HouseArrays) -> dict[str, np.ndarray]:
    rent, bmin, bmax = row(H.rent), col(T.budget_min), col(T.budget_max)
    span = np.maximum(bmax - bmin, 1)
    budget = np.where(rent <= bmin, 1.0, 1 - 0.5 * np.clip((rent - bmin) / span, 0, 1))

    early = col(T.move_in) - row(H.available_from)          # >0: free before move-in
    timing = np.where(early >= 0, np.clip(1 - early / 60, 0.5, 1),
                      np.clip(1 + early / MOVE_IN_GRACE_DAYS * 0.7, 0, 1))

    g, p = col(T.guests), row(H.guest_policy)
    guest = np.select([g == 0, (g == 1) & (p == 0), (g == 2) & (p == 0), (g == 2) & (p == 1)],
                      [1.0, 0.4, 0.1, 0.6], 1.0)
    quiet_set = row(H.quiet_start) > 0
    early_quiet = quiet_set & (row(H.quiet_start) <= QUIET_HOURS_STARTS.index("22:00"))
    night_owl = col(T.sleep) == SLEEP_SCHEDULES.index("night_owl")
    needs_quiet = col(T.noise) <= 2
    quiet = np.select([night_owl & early_quiet, needs_quiet & quiet_set, needs_quiet & ~quiet_set],
                      [0.5, 1.0, 0.6], 1.0)

    pref = row(H.preferred_tenants)
    student = col(T.is_student)
    tenant_pref = np.where(((pref == 1) & ~student) | ((pref == 2) & student), 0.3, 1.0)

    wants = np.zeros((len(T), len(AMENITIES)), dtype=np.float32)
    wants[:, _BASE_WANTS] = 1
    wants[np.isin(T.work, [1, 2]), _DESK] = 1                 # from_home / mixed want a desk
    have = (wants @ H.amenities.T.astype(np.float32)) / wants.sum(1, keepdims=True)

    comps = {
        "budget": budget,
        "area": T.areas[:, H.area].astype(float),
        "room": np.where(col(T.room) == row(H.room), 1.0, 0.6),
        "timing": timing,
        "lifestyle": (guest + quiet) / 2,
        "tenant_pref": tenant_pref,
        "amenities": 0.5 + 0.5 * have,
    }
    return {k: np.broadcast_to(v, (len(T), len(H))).astype(np.float32) for k, v in comps.items()}


def house_rule_score(T: TenantArrays, H: HouseArrays, comps=None) -> np.ndarray:
    comps = comps or house_components(T, H)
    return sum(w * comps[k] for k, w in HOUSE_WEIGHTS.items())


def house_explain(t: TenantProfile, h: House, comps: dict[str, float]):
    reasons, cautions = [], []
    reasons.append(f"€{h.rent}/month, within your €{t.budget_max} budget")
    if comps["area"] == 1:
        reasons.append(f"In {h.area}, one of your areas")
    else:
        cautions.append(f"{h.area} isn't one of your areas")
    if comps["room"] == 1:
        reasons.append(f"{h.room_type.title() if h.room_type != 'ensuite' else 'En-suite'} room, as you wanted")
    days = (t.move_in_date - h.available_from).days
    if days >= 0:
        reasons.append("Available by your move-in date")
    else:
        cautions.append(f"Available {-days} days after your move-in date")
    if comps["lifestyle"] < 0.6:
        cautions.append("House rules may not suit your lifestyle")
    if comps["tenant_pref"] < 1:
        cautions.append("Landlord prefers a different type of tenant")
    nice = [a for a in ("Bills included", "Study desk", "WiFi", "En-suite") if a in h.amenities]
    if nice:
        reasons.append("Has " + ", ".join(nice[:2]))
    return reasons[:4], cautions[:2]


def today() -> date:
    return date.today()
