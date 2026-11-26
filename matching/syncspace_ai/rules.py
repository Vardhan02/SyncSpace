# compatibility rules - dealbreaker filters, the weighted rule score and the
# reasons/cautions text for the cards
# all of these work on n tenants x m candidates at once and give (n, m) arrays

import numpy as np

from .schema import AMENITIES, QUIET_HOURS_STARTS, SLEEP_SCHEDULES


def col(x):
    return np.asarray(x)[:, None]


def row(x):
    return np.asarray(x)[None, :]


def first_failure(checks, shape):
    # 0 = ok, otherwise the number of the first check that failed
    fail = np.zeros(shape, dtype=np.int8)
    for code in range(len(checks), 0, -1):
        fail[checks[code - 1]] = code
    return fail


# ---------------- roommates ----------------

ROOMMATE_BUDGET_SLACK = 50   # euro gap we still allow between budgets
ROOMMATE_FILTERS = ["ok", "Budgets don't overlap", "Smoking dealbreaker", "Pets dealbreaker"]
ROOMMATE_WEIGHTS = {
    "sleep": 0.14, "clean": 0.14, "noise": 0.10, "social": 0.14, "guests": 0.08,
    "work": 0.05, "area": 0.12, "budget": 0.06, "move_in": 0.07, "interests": 0.10,
}
STEP3 = np.array([1.0, 0.6, 0.15])   # score for a difference of 0, 1 or 2 steps


def roommate_hard_filter(A, B):
    budget = ((col(A.budget_max) + ROOMMATE_BUDGET_SLACK < row(B.budget_min)) |
              (row(B.budget_max) + ROOMMATE_BUDGET_SLACK < col(A.budget_min)))
    smoke = (col(A.smoker) & ~row(B.ok_smoke)) | (row(B.smoker) & ~col(A.ok_smoke))
    pets = (col(A.pets) & ~row(B.ok_pets)) | (row(B.pets) & ~col(A.ok_pets))
    return first_failure([budget, smoke, pets], (len(A), len(B)))


def interest_overlap(A, B):
    # jaccard of interests, 0.5 if someone didn't pick any
    vocab = sorted(set().union(*A.interests, *B.interests))
    if not vocab:
        return np.full((len(A), len(B)), 0.5)
    MA = np.array([[v in s for v in vocab] for s in A.interests], dtype=np.float32)
    MB = np.array([[v in s for v in vocab] for s in B.interests], dtype=np.float32)
    inter = MA @ MB.T
    union = MA.sum(1)[:, None] + MB.sum(1)[None, :] - inter
    j = np.divide(inter, union, out=np.zeros_like(inter), where=union > 0)
    empty = (MA.sum(1)[:, None] == 0) | (MB.sum(1)[None, :] == 0)
    return np.where(empty, 0.5, j)


def roommate_components(A, B):
    def diff(x, y):
        return np.abs(col(x) - row(y))

    work_a, work_b = col(A.work), row(B.work)
    night_a, night_b = work_a == 3, work_b == 3   # 3 = night_shifts
    lo = np.maximum(col(A.budget_min), row(B.budget_min))
    hi = np.minimum(col(A.budget_max), row(B.budget_max))
    width = np.maximum(np.minimum(col(A.budget_max - A.budget_min), row(B.budget_max - B.budget_min)), 50)

    comps = {
        "sleep": np.where(col(A.sleep) == row(B.sleep), 1.0, 0.2),
        "clean": STEP3[diff(A.clean, B.clean)],
        "noise": 1 - diff(A.noise, B.noise) / 4,
        "social": STEP3[diff(A.social, B.social)],
        "guests": np.array([1.0, 0.6, 0.2])[diff(A.guests, B.guests)],
        "work": np.where(work_a == work_b, 1.0, np.where(night_a ^ night_b, 0.5, 0.75)),
        "area": (A.areas.astype(np.float32) @ B.areas.T.astype(np.float32) > 0).astype(float),
        "budget": np.clip((hi - lo) / width, 0, 1),
        "move_in": np.clip(1 - diff(A.move_in, B.move_in) / 60, 0, 1),
        "interests": interest_overlap(A, B),
    }
    return {k: v.astype(np.float32) for k, v in comps.items()}


def roommate_rule_score(A, B, comps=None):
    comps = comps or roommate_components(A, B)
    return sum(w * comps[k] for k, w in ROOMMATE_WEIGHTS.items())


def roommate_explain(a, b, comps):
    reasons, cautions = [], []

    if comps["sleep"] == 1:
        reasons.append("Both early birds" if a.sleep_schedule == "early_bird" else "Both night owls")
    else:
        cautions.append("Different sleep schedules")

    if comps["clean"] == 1:
        reasons.append("Same cleanliness standards")
    elif comps["clean"] < 0.5:
        cautions.append("Very different cleanliness standards")

    if comps["social"] == 1:
        if a.social_level == "homebody":
            reasons.append("Both homebodies")
        elif a.social_level == "social":
            reasons.append("Both very social")
        else:
            reasons.append("Similar social style")
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

    # anyone who got past the filters has overlapping budgets, so this always works
    if not reasons:
        lo, hi = max(a.budget_min, b.budget_min), min(a.budget_max, b.budget_max)
        reasons.append(f"Similar budgets (€{lo}–€{hi})" if lo <= hi else "Similar budgets")

    return reasons[:4], cautions[:2]


# ---------------- houses ----------------

MOVE_IN_GRACE_DAYS = 30   # house can free up this many days after the move-in date
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
BASIC_AMENITIES = [AMENITIES.index(a) for a in ("WiFi", "Central heating", "Washing machine")]
DESK = AMENITIES.index("Study desk")


def house_hard_filter(T, H):
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
    return first_failure(checks, (len(T), len(H)))


def house_components(T, H):
    rent, bmin, bmax = row(H.rent), col(T.budget_min), col(T.budget_max)
    span = np.maximum(bmax - bmin, 1)
    budget = np.where(rent <= bmin, 1.0, 1 - 0.5 * np.clip((rent - bmin) / span, 0, 1))

    # early > 0 means the house is free before the tenant moves in
    early = col(T.move_in) - row(H.available_from)
    timing = np.where(early >= 0, np.clip(1 - early / 60, 0.5, 1),
                      np.clip(1 + early / MOVE_IN_GRACE_DAYS * 0.7, 0, 1))

    # guests vs house guest policy
    g, p = col(T.guests), row(H.guest_policy)
    guest = np.select([g == 0, (g == 1) & (p == 0), (g == 2) & (p == 0), (g == 2) & (p == 1)],
                      [1.0, 0.4, 0.1, 0.6], 1.0)

    # quiet hours vs sleep / noise
    quiet_set = row(H.quiet_start) > 0
    early_quiet = quiet_set & (row(H.quiet_start) <= QUIET_HOURS_STARTS.index("22:00"))
    night_owl = col(T.sleep) == SLEEP_SCHEDULES.index("night_owl")
    needs_quiet = col(T.noise) <= 2
    quiet = np.select([night_owl & early_quiet, needs_quiet & quiet_set, needs_quiet & ~quiet_set],
                      [0.5, 1.0, 0.6], 1.0)

    # landlord wants students / professionals
    pref = row(H.preferred_tenants)
    student = col(T.is_student)
    tenant_pref = np.where(((pref == 1) & ~student) | ((pref == 2) & student), 0.3, 1.0)

    # everyone wants the basics, people working from home also want a desk
    wants = np.zeros((len(T), len(AMENITIES)), dtype=np.float32)
    wants[:, BASIC_AMENITIES] = 1
    wants[np.isin(T.work, [1, 2]), DESK] = 1
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


def house_rule_score(T, H, comps=None):
    comps = comps or house_components(T, H)
    return sum(w * comps[k] for k, w in HOUSE_WEIGHTS.items())


def house_explain(t, h, comps):
    reasons, cautions = [], []
    reasons.append(f"€{h.rent}/month, within your €{t.budget_max} budget")

    if comps["area"] == 1:
        reasons.append(f"In {h.area}, one of your areas")
    else:
        cautions.append(f"{h.area} isn't one of your areas")

    if comps["room"] == 1:
        room = "En-suite" if h.room_type == "ensuite" else h.room_type.title()
        reasons.append(f"{room} room, as you wanted")

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
