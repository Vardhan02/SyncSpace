# Matching API for SyncSpace
# run from matching/:  uvicorn syncspace_ai.api:app --port 8001
# docs at http://localhost:8001/docs
# The backend calls this, it doesn't talk to the database itself.

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .recommender import ARTIFACT_DIR, Recommender
from .schema import (SCHEMA_VERSION, FilteredItem, House, RankHousesRequest, RankResponse,
                     RankRoommatesRequest, TenantProfile, schema_summary)

logging.basicConfig(level=logging.INFO)
state = {}


@asynccontextmanager
async def lifespan(app):
    # load models once at startup
    state["rec"] = Recommender(os.environ.get("SYNCSPACE_ARTIFACTS", ARTIFACT_DIR))
    yield
    state.clear()


app = FastAPI(title="SyncSpace matching service", version=SCHEMA_VERSION, lifespan=lifespan)

origins = os.environ.get("SYNCSPACE_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    # mode = "hybrid" if models loaded, otherwise "rules"
    return {"status": "ok", "schema_version": SCHEMA_VERSION, **state["rec"].status()}


@app.get("/schema")
def schema():
    # all allowed values, so frontend/backend can check their enums
    return schema_summary()


def check_each(rows, model, id_key):
    # validate rows one at a time, bad ones go to filtered_out instead of failing everything
    good, bad = [], []
    for row in rows:
        try:
            good.append(model.model_validate(row))
        except ValidationError as e:
            loc = e.errors()[0]["loc"]
            field = loc[0] if loc else "budget"   # the budget check has no field name
            bad.append(FilteredItem(id=str(row.get(id_key, "unknown")),
                                    reason=f"Incomplete or invalid profile ({field})"))
    return good, bad


@app.post("/rank/roommates", response_model=RankResponse)
def rank_roommates(req: RankRoommatesRequest):
    candidates, bad = check_each(req.candidates, TenantProfile, "tenant_id")
    res = state["rec"].rank_roommates(req.tenant, candidates, req.limit, req.today)
    res.filtered_out += bad
    return res


@app.post("/rank/houses", response_model=RankResponse)
def rank_houses(req: RankHousesRequest):
    houses, bad = check_each(req.houses, House, "house_id")
    res = state["rec"].rank_houses(req.tenant, houses, req.limit, req.today)
    res.filtered_out += bad
    return res
