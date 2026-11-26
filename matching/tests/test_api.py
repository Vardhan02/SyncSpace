# API tests, needs the trained models in artifacts/ (takes ~10s to load)
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from syncspace_ai.api import app
from syncspace_ai.schema import House

EXAMPLES = Path(__file__).resolve().parent.parent / "examples"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def body(name):
    return json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))


def test_health(client):
    r = client.get("/health").json()
    assert r["status"] == "ok"
    assert r["mode"] == "hybrid", "run train.py so the models are loaded"


def test_schema_lists_enums(client):
    s = client.get("/schema").json()
    assert "Douglas" in s["areas"]
    assert s["room_types"] == ["single", "double", "ensuite"]


@pytest.mark.parametrize("name,key", [("rank_roommates", "candidates"), ("rank_houses", "houses")])
def test_rank_endpoints(client, name, key):
    req = body(name)
    r = client.post(f"/{name.replace('_', '/')}", json=req)
    assert r.status_code == 200, r.text
    out = r.json()
    scores = [x["score"] for x in out["results"]]
    assert scores and scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)
    assert all(x["reasons"] for x in out["results"])
    assert len(out["results"]) + len(out["filtered_out"]) == len(req[key])
    assert out["filtered_out"], "examples include at least one dealbreaker"


def test_roommates_excludes_self(client):
    req = body("rank_roommates")
    req["candidates"].append(req["tenant"])
    ids = [x["id"] for x in client.post("/rank/roommates", json=req).json()["results"]]
    assert req["tenant"]["tenant_id"] not in ids


def test_limit(client):
    req = body("rank_houses") | {"limit": 2}
    assert len(client.post("/rank/houses", json=req).json()["results"]) <= 2


def test_bad_enum_is_422(client):
    req = body("rank_houses")
    req["tenant"]["room_type"] = "Single room"
    r = client.post("/rank/houses", json=req)
    assert r.status_code == 422
    assert "room_type" in r.text


def test_bad_candidate_is_skipped_not_422(client):
    req = body("rank_roommates")
    bad_id = req["candidates"][0]["tenant_id"]
    del req["candidates"][0]["sleep_schedule"]          # didn't finish onboarding
    r = client.post("/rank/roommates", json=req)
    assert r.status_code == 200
    out = r.json()
    assert out["results"]
    assert {"id": bad_id, "reason": "Incomplete or invalid profile (sleep_schedule)"} in out["filtered_out"]


def test_bad_budget_is_skipped(client):
    req = body("rank_roommates")
    req["candidates"][0]["budget_min"], req["candidates"][0]["budget_max"] = 900, 500
    out = client.post("/rank/roommates", json=req).json()
    assert any("budget" in f["reason"] for f in out["filtered_out"])


def test_unknown_area_is_ignored(client):
    req = body("rank_roommates")
    req["candidates"][0]["preferred_areas"] = ["Shandon", "City Centre"]   # like seed tenant 205
    out = client.post("/rank/roommates", json=req).json()
    ids = [x["id"] for x in out["results"]] + [f["id"] for f in out["filtered_out"]]
    assert req["candidates"][0]["tenant_id"] in ids
    assert not any("invalid" in f["reason"] for f in out["filtered_out"])


@pytest.mark.parametrize("given,expected", [
    ("23:00:00", "23:00"), ("22:30", "22:00"), ("22:45", "23:00"), ("00:30", "00:00"),
    ("20:00", "21:00"), ("", None), (None, None),
])
def test_quiet_hours_are_normalised(given, expected):
    h = body("rank_houses")["houses"][0] | {"quiet_hours_start": given}
    assert House(**h).quiet_hours_start == expected


def test_numeric_house_ids(client):
    req = body("rank_houses")
    for i, h in enumerate(req["houses"]):
        h["house_id"] = 101 + i
    r = client.post("/rank/houses", json=req)
    assert r.status_code == 200
    assert all(x["id"].isdigit() for x in r.json()["results"])


def test_empty_candidates(client):
    req = body("rank_roommates") | {"candidates": []}
    out = client.post("/rank/roommates", json=req).json()
    assert out["results"] == [] and out["filtered_out"] == []
