"""
SyncSpace matching service.

    uvicorn syncspace_ai.api:app --port 8001          (run from the matching/ folder)
    open http://localhost:8001/docs                    (interactive docs)

The backend calls this service; it does not touch the database itself.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .recommender import ARTIFACT_DIR, Recommender
from .schema import (SCHEMA_VERSION, RankHousesRequest, RankResponse, RankRoommatesRequest,
                     schema_summary)

logging.basicConfig(level=logging.INFO)
state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["rec"] = Recommender(os.environ.get("SYNCSPACE_ARTIFACTS", ARTIFACT_DIR))
    yield
    state.clear()


app = FastAPI(title="SyncSpace matching service", version=SCHEMA_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("SYNCSPACE_CORS_ORIGINS", "*").split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def rec() -> Recommender:
    return state["rec"]


@app.get("/health")
def health():
    """`mode` is "hybrid" when the models are loaded, "rules" if it fell back."""
    return {"status": "ok", "schema_version": SCHEMA_VERSION, **rec().status()}


@app.get("/schema")
def schema():
    """Every allowed field value. Use it to check the frontend/backend enums match."""
    return schema_summary()


@app.post("/rank/roommates", response_model=RankResponse)
def rank_roommates(req: RankRoommatesRequest):
    """Order the Roommate swipe deck for `tenant`. Dealbreakers are listed in `filtered_out`."""
    return rec().rank_roommates(req.tenant, req.candidates, req.limit, req.today)


@app.post("/rank/houses", response_model=RankResponse)
def rank_houses(req: RankHousesRequest):
    """Order the Houses grid for `tenant` (highest score = top-left card)."""
    return rec().rank_houses(req.tenant, req.houses, req.limit, req.today)
