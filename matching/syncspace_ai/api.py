# Matching API for SyncSpace
# run from matching/:  uvicorn syncspace_ai.api:app --port 8001
# docs at http://localhost:8001/docs
# The backend calls this, it doesn't talk to the database itself.

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .recommender import ARTIFACT_DIR, Recommender
from .schema import SCHEMA_VERSION, RankHousesRequest, RankResponse, RankRoommatesRequest, schema_summary

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


@app.post("/rank/roommates", response_model=RankResponse)
def rank_roommates(req: RankRoommatesRequest):
    return state["rec"].rank_roommates(req.tenant, req.candidates, req.limit, req.today)


@app.post("/rank/houses", response_model=RankResponse)
def rank_houses(req: RankHousesRequest):
    return state["rec"].rank_houses(req.tenant, req.houses, req.limit, req.today)
