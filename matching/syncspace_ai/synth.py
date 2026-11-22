"""
Synthetic Cork tenants and listings in the exact Supabase schema, for cold-start training.

Why this isn't just "copy the rules":
Every synthetic tenant has a hidden persona (quiet studier, social, outdoorsy...). It
nudges their form answers and writes their prompt answers + bio, but the persona itself
is never given to the models. The simulated "would they actually get on?" outcome
(`roommate_truth`, `house_truth`) depends on the rules AND on the hidden persona fit.
So a rules-only ranker can't fully recover it; a model has to read the text to do better.

It is still synthetic. It shows the pipeline works and what each part adds; real accuracy
can only be measured once we have real swipes and likes.
"""
from __future__ import annotations

import random
from datetime import date, timedelta

import numpy as np

from .arrays import house_arrays, tenant_arrays
from .rules import (house_components, house_hard_filter, house_rule_score,
                    roommate_components, roommate_hard_filter, roommate_rule_score)
from .schema import AMENITIES, AREAS, House, PromptAnswer, TenantProfile

PERSONAS = ["quiet_studious", "balanced", "social", "active", "night_creative"]
QS, BAL, SOC, ACT, NC = range(5)

# How well two personas get on as housemates (symmetric, 0-1). Hidden from the models.
AFFINITY = np.array([
    #  QS   BAL  SOC  ACT  NC
    [1.0, 0.6, 0.1, 0.6, 0.3],   # quiet_studious
    [0.6, 0.8, 0.6, 0.7, 0.5],   # balanced
    [0.1, 0.6, 0.9, 0.5, 0.4],   # social
    [0.6, 0.7, 0.5, 0.9, 0.2],   # active
    [0.3, 0.5, 0.4, 0.2, 0.9],   # night_creative
])

# Amenities each persona quietly cares about (hidden; hinted at in their text).
PERSONA_AMENITIES = {
    QS: ["Study desk", "WiFi", "Central heating"],
    BAL: ["Bills included", "Washing machine", "Kitchen access"],
    SOC: ["Garden", "Balcony", "Kitchen access", "Dishwasher"],
    ACT: ["Bike storage", "Garden", "Washing machine", "Dryer"],
    NC: ["WiFi", "En-suite", "Study desk"],
}

ANSWERS = {
    QS: {
        1: ["Tea, a good book and in bed by eleven.", "Quiet night in after a long week in the library."],
        2: ["Quiet after 10pm on weeknights, no exceptions.", "Clean the kitchen the same day you use it."],
        3: ["Big batch of soup for the week so I can keep studying.", "Porridge and meal prep for exam season."],
        4: ["Loud music at 1am when I've a 9am lecture.", "Dishes left in the sink for days."],
        5: ["Revising at my desk with a coffee, then a walk in Fitzgerald's Park.", "Catching up on reading and doing laundry."],
        6: ["Respect my study time and keep shared spaces tidy.", "A quiet house and a cup of tea."],
        7: ["Final year medicine, lots of hospital placements.", "A master's thesis on climate policy."],
        8: ["Finding a free desk in the Boole library.", "A warm house on a rainy Cork evening."],
        9: ["Talk it through calmly over a cup of tea.", "A polite chat and a written rota if needed."],
        10: ["Colour-coding my notes.", "Finishing crosswords before anyone else is awake."],
    },
    BAL: {
        1: ["Dinner with housemates then maybe one or two drinks.", "Film night in, or the pub if friends are around."],
        2: ["Take your turn on the bins and the bills.", "Replace what you use up."],
        3: ["Curry for whoever's home, happy to share.", "Pasta bakes, nothing fancy but plenty of it."],
        4: ["People who never chip in for shared stuff.", "Bills being paid late."],
        5: ["Brunch, a bit of study, then a walk by the Lee.", "Laundry, groceries and a film in the evening."],
        6: ["Be easygoing and honest.", "Share your snacks and your playlists."],
        7: ["Business and accounting, with a part-time job in town.", "Computer science, doing a bit of everything."],
        8: ["Bills included so there's no awkward maths.", "A good chat in the kitchen."],
        9: ["Sort it out straight away, no passive-aggressive notes.", "Meet in the middle and move on."],
        10: ["Budgeting for the whole house.", "Fixing the WiFi when it drops."],
    },
    SOC: {
        1: ["Pre-drinks at ours then out on Oliver Plunkett Street.", "Gig in Cyprus Avenue then late-night chips."],
        2: ["Always let people know before you bring friends back.", "Clean up after the party the next morning."],
        3: ["Massive dinners for the whole house and their friends.", "Barbecue in the garden whenever the sun is out."],
        4: ["Housemates who never want to hang out.", "People who complain about a bit of noise at the weekend."],
        5: ["Recovering, then a big group brunch.", "Out in the garden with friends and music."],
        6: ["Be up for a night out or a house party.", "Come to my society events."],
        7: ["Arts and drama, and I run a student society.", "Marketing, always organising events."],
        8: ["A spontaneous trip to the pub with housemates.", "A full kitchen table on a Sunday."],
        9: ["Sort it over a pint.", "Have it out and then hug it out."],
        10: ["Getting a party going in five minutes.", "Remembering everyone's name."],
    },
    ACT: {
        1: ["Early night because I'm cycling or hiking on Saturday.", "Five-a-side then a quiet dinner."],
        2: ["Don't leave wet gear in the hall, there's a rack for that.", "Keep the bikes in the shed, not the hallway."],
        3: ["High-protein meal prep after the gym.", "Smoothies at 7am, sorry about the blender."],
        4: ["The washing machine always full when I need my kit.", "People sleeping all day and up all night."],
        5: ["Out on a long cycle to Kinsale.", "Hiking in West Cork and back for dinner."],
        6: ["Come for a run with me along the Marina.", "Join my GAA club or the hiking society."],
        7: ["Sports science, with lots of training.", "Engineering, and coaching kids' football at weekends."],
        8: ["A dry day for a cycle.", "A good gym session before lectures."],
        9: ["Talk it out on a walk.", "Be direct, then go for a run and forget it."],
        10: ["Fixing bikes.", "Packing a hiking bag in two minutes flat."],
    },
    NC: {
        1: ["Making music in my room until 3am, with headphones.", "Gaming marathon with friends online."],
        2: ["Don't wake me before noon on weekends.", "Knock before coming into my room."],
        3: ["Ramen at 2am.", "Toasties at odd hours."],
        4: ["Housemates who need everything silent at 9pm.", "People touching my gear."],
        5: ["Asleep until 1pm, then sketching or editing videos.", "Playing guitar and writing songs."],
        6: ["Send me a good album or a weird film.", "Leave me alone when I'm in the zone."],
        7: ["Game design, and I work night shifts at a hotel.", "Film and screen media, editing all night."],
        8: ["Fast WiFi and a good pair of headphones.", "A quiet kitchen at midnight."],
        9: ["Message about it, then chat when we've both cooled off.", "Give it a day and come back to it."],
        10: ["Speedrunning old games.", "Drawing people from memory."],
    },
}
BIOS = {
    QS: ["Postgrad who studies a lot and likes a calm, tidy house.", "Quiet, organised and usually in the library."],
    BAL: ["Easygoing student, social sometimes but I need my sleep.", "Friendly, tidy enough, happy to share a meal."],
    SOC: ["Love having people over and always up for a night out.", "Very social, big into societies, gigs and parties."],
    ACT: ["Gym, cycling and hiking most days; up early.", "Sporty early riser, I cycle everywhere around Cork."],
    NC: ["Night owl and creative, I do most of my work late.", "Musician and gamer, quiet but up late."],
}
INTERESTS = {
    QS: ["Reading", "Coffee", "Board games", "Cooking"],
    BAL: ["Movies", "Cooking", "Music", "Coffee"],
    SOC: ["Music", "Sports", "Movies", "Cooking"],
    ACT: ["Hiking", "Gym", "Sports", "Cooking"],
    NC: ["Gaming", "Music", "Movies", "Coffee"],
}
# (sleep early_bird prob, cleanliness weights, noise range, work weights, social weights, guest weights)
HABITS = {
    QS: (0.8, [0.6, 0.35, 0.05], (1, 2), [0.5, 0.35, 0.15, 0.0], [0.75, 0.25, 0.0], [0.75, 0.25, 0.0]),
    BAL: (0.55, [0.25, 0.55, 0.2], (2, 4), [0.35, 0.2, 0.4, 0.05], [0.2, 0.65, 0.15], [0.3, 0.55, 0.15]),
    SOC: (0.25, [0.1, 0.45, 0.45], (4, 5), [0.4, 0.1, 0.45, 0.05], [0.0, 0.25, 0.75], [0.05, 0.35, 0.6]),
    ACT: (0.85, [0.4, 0.5, 0.1], (2, 4), [0.55, 0.1, 0.35, 0.0], [0.2, 0.55, 0.25], [0.35, 0.5, 0.15]),
    NC: (0.1, [0.1, 0.4, 0.5], (3, 4), [0.05, 0.5, 0.15, 0.3], [0.45, 0.45, 0.1], [0.45, 0.4, 0.15]),
}
COURSES = ["Medicine", "Computer Science", "Business", "Engineering", "Law", "Arts",
           "Data Science", "Nursing", "Commerce", "Sports Science", "Film and Screen Media"]
AREA_PREMIUM = {"Victoria Cross": 60, "College Road": 90, "Bishopstown": 30, "Wilton": 20,
                "Douglas": 10, "Blackrock": 40, "Shandon": 0, "The Lough": 30}
ROOM_BASE = {"single": 600, "double": 700, "ensuite": 850}


def _choice(rng, values, weights):
    return values[rng.choices(range(len(values)), weights=weights)[0]]


def generate_tenants(n: int, today: date, seed: int = 0, id_prefix: str = "t") -> tuple[list[TenantProfile], np.ndarray]:
    rng = random.Random(seed)
    tenants, personas = [], []
    for i in range(n):
        p = rng.randrange(len(PERSONAS))
        early, clean_w, noise_rng, work_w, social_w, guest_w = HABITS[p]
        bmin = rng.randint(35, 90) * 10
        smoker = rng.random() < 0.12
        pets = rng.random() < 0.12
        prompt_ids = rng.sample(range(1, 11), 3)
        answers = []
        for slot, pid in enumerate(prompt_ids, start=1):
            src = p if rng.random() < 0.8 else rng.randrange(len(PERSONAS))   # some noise
            answers.append(PromptAnswer(prompt_id=pid, slot=slot, answer=rng.choice(ANSWERS[src][pid])))
        student = rng.random() < 0.9
        interests = rng.sample(INTERESTS[p], rng.randint(1, 3)) + \
            rng.sample(sorted({x for v in INTERESTS.values() for x in v}), rng.randint(0, 2))
        tenants.append(TenantProfile(
            tenant_id=f"{id_prefix}{i}",
            age=rng.randint(18, 30),
            university=rng.choice(["UCC", "MTU"]) if student else None,
            course=rng.choice(COURSES) if student else None,
            bio=rng.choice(BIOS[p]) if rng.random() < 0.85 else "",
            budget_min=bmin,
            budget_max=min(1500, bmin + rng.randint(10, 40) * 10),
            preferred_areas=rng.sample(AREAS, rng.choice([1, 2, 2, 3])),
            room_type=_choice(rng, ["single", "double", "ensuite"], [0.45, 0.35, 0.2]),
            move_in_date=today + timedelta(days=rng.randint(0, 120)),
            lease_months=_choice(rng, [3, 5, 9, 12], [0.1, 0.15, 0.45, 0.3]),
            max_housemates=rng.randint(1, 5),
            sleep_schedule="early_bird" if rng.random() < early else "night_owl",
            noise_tolerance=rng.randint(*noise_rng),
            cleanliness=_choice(rng, ["very_tidy", "tidy", "relaxed"], clean_w),
            work_schedule=_choice(rng, ["on_campus", "from_home", "mixed", "night_shifts"], work_w),
            social_level=_choice(rng, ["homebody", "balanced", "social"], social_w),
            guest_frequency=_choice(rng, ["rarely", "weekends", "often"], guest_w),
            smoker=smoker,
            ok_with_smoking=smoker or rng.random() < 0.25,
            has_pets=pets,
            ok_with_pets=pets or rng.random() < 0.5,
            interests=list(dict.fromkeys(interests))[:6],
            prompt_answers=answers,
        ))
        personas.append(p)
    return tenants, np.array(personas)


def generate_houses(n: int, today: date, seed: int = 0, id_prefix: str = "h") -> list[House]:
    rng = random.Random(seed)
    houses = []
    for i in range(n):
        area = rng.choice(AREAS)
        room = _choice(rng, ["single", "double", "ensuite"], [0.4, 0.4, 0.2])
        amen = [a for a in AMENITIES if rng.random() < 0.4 and a != "En-suite"]
        if room == "ensuite":
            amen.append("En-suite")
        quiet = _choice(rng, [None, "21:00", "22:00", "23:00", "00:00"], [0.45, 0.1, 0.2, 0.15, 0.1])
        houses.append(House(
            house_id=f"{id_prefix}{i}",
            area=area,
            rent=int(np.clip(rng.gauss(ROOM_BASE[room] + AREA_PREMIUM[area], 120), 350, 1600)),
            rooms_available=0 if rng.random() < 0.04 else rng.randint(1, 4),
            room_type=room,
            available_from=today + timedelta(days=rng.randint(0, 120)),
            amenities=amen,
            pets_allowed=rng.random() < 0.3,
            smoking_allowed=rng.random() < 0.15,
            guest_policy=_choice(rng, ["no_overnight", "weekends", "welcome"], [0.25, 0.45, 0.3]),
            quiet_hours_start=quiet,
            min_lease_months=_choice(rng, [1, 3, 5, 9, 12], [0.15, 0.1, 0.15, 0.35, 0.25]),
            max_occupants=rng.randint(2, 7),
            preferred_tenants=_choice(rng, ["any", "student", "professional"], [0.6, 0.3, 0.1]),
        ))
    return houses


# ---------------------------------------------------------------- simulated outcomes
ROOMMATE_TRUTH_THRESHOLD = 0.70
HOUSE_TRUTH_THRESHOLD = 0.68


def _pair_noise(n: int, m: int, seed: int, symmetric: bool) -> np.ndarray:
    z = np.random.default_rng(seed).normal(0, 0.06, size=(n, m))
    return (z + z.T) / 2 if symmetric and n == m else z


def roommate_truth_score(A, pa, B, pb, seed: int = 1) -> np.ndarray:
    """Simulated 'they'd actually get on' score: 50% rules, 50% hidden persona fit."""
    rule = roommate_rule_score(tenant_arrays(A), tenant_arrays(B))
    return 0.5 * rule + 0.5 * AFFINITY[pa][:, pb] + _pair_noise(len(A), len(B), seed, A is B)


def roommate_truth(A, pa, B, pb, seed: int = 1) -> np.ndarray:
    TA, TB = tenant_arrays(A), tenant_arrays(B)
    ok = roommate_hard_filter(TA, TB) == 0
    good = roommate_truth_score(A, pa, B, pb, seed) >= ROOMMATE_TRUTH_THRESHOLD
    out = ok & good
    if A is B:
        np.fill_diagonal(out, False)
    return out


def amenity_fit(pa: np.ndarray, houses: list[House]) -> np.ndarray:
    H = house_arrays(houses)
    want = np.zeros((len(PERSONAS), len(AMENITIES)), dtype=np.float32)
    for p, names in PERSONA_AMENITIES.items():
        want[p, [AMENITIES.index(a) for a in names]] = 1
    fit = (want @ H.amenities.T.astype(np.float32)) / want.sum(1, keepdims=True)
    return fit[pa]


def house_truth(tenants, pa, houses, seed: int = 2) -> np.ndarray:
    """Simulated 'they'd like this listing': passes dealbreakers and
    65% rules + 35% hidden amenity taste is high enough."""
    T, H = tenant_arrays(tenants), house_arrays(houses)
    ok = house_hard_filter(T, H) == 0
    score = 0.65 * house_rule_score(T, H) + 0.35 * amenity_fit(pa, houses) + \
        _pair_noise(len(tenants), len(houses), seed, False)
    return ok & (score >= HOUSE_TRUTH_THRESHOLD)
