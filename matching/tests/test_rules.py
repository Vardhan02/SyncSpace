# rule + schema tests, these don't load any models so they're quick
from datetime import date

import numpy as np
import pytest
from pydantic import ValidationError

from syncspace_ai.arrays import house_arrays, tenant_arrays
from syncspace_ai.recommender import Recommender
from syncspace_ai.rules import (HOUSE_FILTERS, ROOMMATE_FILTERS, house_hard_filter,
                                house_rule_score, roommate_hard_filter, roommate_rule_score)
from syncspace_ai.schema import House, TenantProfile
from syncspace_ai.synth import generate_houses, generate_tenants

TODAY = date(2026, 12, 1)


def tenant(**kw):
    base = dict(
        tenant_id="a", age=22, university="UCC", course="CS", bio="Quiet and tidy.",
        budget_min=500, budget_max=800, preferred_areas=["Douglas"], room_type="single",
        move_in_date="2026-12-10", lease_months=9, max_housemates=3,
        sleep_schedule="early_bird", noise_tolerance=2, cleanliness="tidy",
        work_schedule="on_campus", social_level="balanced", guest_frequency="weekends",
        smoker=False, ok_with_smoking=False, has_pets=False, ok_with_pets=True,
        interests=["Cooking", "Reading"],
        prompt_answers=[{"prompt_id": 1, "answer": "Film and an early night.", "slot": 1}],
    )
    base.update(kw)
    return TenantProfile(**base)


def house(**kw):
    base = dict(
        house_id="h", area="Douglas", rent=700, rooms_available=1, room_type="single",
        available_from="2026-12-01", amenities=["WiFi", "Study desk"], pets_allowed=False,
        smoking_allowed=False, guest_policy="weekends", quiet_hours_start=None,
        min_lease_months=9, max_occupants=4,
    )
    base.update(kw)
    return House(**base)


def rm_code(a, b):
    return ROOMMATE_FILTERS[roommate_hard_filter(tenant_arrays([a]), tenant_arrays([b]))[0, 0]]


def house_code(t, h):
    return HOUSE_FILTERS[house_hard_filter(tenant_arrays([t]), house_arrays([h]))[0, 0]]


# --- schema ---
def test_rejects_unknown_enum_value():
    with pytest.raises(ValidationError):
        tenant(sleep_schedule="Night owl")          # old frontend label, not the DB value


def test_rejects_unknown_area():
    with pytest.raises(ValidationError):
        tenant(preferred_areas=["City Centre"])


def test_rejects_inverted_budget():
    with pytest.raises(ValidationError):
        tenant(budget_min=900, budget_max=600)


def test_ignores_extra_db_columns():
    t = tenant(created_at="2026-11-01T00:00:00Z", onboarding_complete=True)
    assert t.tenant_id == "a"


# --- roommate rules ---
def test_roommate_dealbreakers():
    a = tenant()
    assert rm_code(a, tenant(tenant_id="b")) == "ok"
    assert rm_code(a, tenant(tenant_id="b", smoker=True, ok_with_smoking=True)) == "Smoking dealbreaker"
    assert rm_code(tenant(ok_with_pets=False), tenant(tenant_id="b", has_pets=True)) == "Pets dealbreaker"
    assert rm_code(a, tenant(tenant_id="b", budget_min=1000, budget_max=1300)) == "Budgets don't overlap"


def test_roommate_rule_score_is_symmetric_and_bounded():
    people, _ = generate_tenants(60, TODAY, seed=3)
    T = tenant_arrays(people)
    s = roommate_rule_score(T, T)
    assert np.allclose(s, s.T, atol=1e-6)
    assert s.min() >= 0 and s.max() <= 1


def test_similar_people_score_higher():
    a = tenant()
    twin = tenant(tenant_id="b")
    opposite = tenant(tenant_id="c", sleep_schedule="night_owl", cleanliness="relaxed",
                      social_level="social", guest_frequency="often", noise_tolerance=5,
                      preferred_areas=["Shandon"], interests=["Gaming"])
    s = roommate_rule_score(tenant_arrays([a]), tenant_arrays([twin, opposite]))[0]
    assert s[0] > s[1]


# --- house rules ---
@pytest.mark.parametrize("t_kw,h_kw,expected", [
    ({}, {}, "ok"),
    ({}, {"rent": 900}, "Over budget"),
    ({"smoker": True, "ok_with_smoking": True}, {}, "Smoking not allowed"),
    ({"has_pets": True}, {}, "Pets not allowed"),
    ({"lease_months": 5}, {}, "Minimum lease longer than wanted"),
    ({"room_type": "ensuite"}, {"room_type": "double"}, "Smaller room type than wanted"),
    ({}, {"available_from": "2027-02-01"}, "Not available in time"),
    ({"max_housemates": 1}, {"max_occupants": 5}, "More housemates than wanted"),
    ({}, {"rooms_available": 0}, "No rooms available"),
])
def test_house_dealbreakers(t_kw, h_kw, expected):
    assert house_code(tenant(**t_kw), house(**h_kw)) == expected


def test_house_in_preferred_area_scores_higher():
    t = tenant()
    s = house_rule_score(tenant_arrays([t]), house_arrays([house(), house(house_id="x", area="Shandon")]))[0]
    assert s[0] > s[1]


# --- rules-only fallback ---
def test_rules_mode_when_models_missing(tmp_path):
    rec = Recommender(artifact_dir=tmp_path)            # empty dir -> nothing to load
    assert rec.mode == "rules"
    houses = generate_houses(50, TODAY, seed=4)
    out = rec.rank_houses(tenant(budget_max=1500, preferred_areas=["Douglas", "Wilton"]), houses, today=TODAY)
    scores = [r.score for r in out.results]
    assert scores == sorted(scores, reverse=True)
    assert len(out.results) + len(out.filtered_out) == len(houses)
    assert all(0 <= s <= 100 for s in scores)
