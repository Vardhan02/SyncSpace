"""API tests against the trained artifacts (loads MiniLM once, ~10 s)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from syncspace_ai.api import app

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


def test_empty_candidates(client):
    req = body("rank_roommates") | {"candidates": []}
    out = client.post("/rank/roommates", json=req).json()
    assert out["results"] == [] and out["filtered_out"] == []
