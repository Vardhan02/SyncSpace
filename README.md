# SyncSpace VLM: Listing Verification

Part of SyncScape, the personality-based roommate matcher. A local vision-language model checks rental listing photos against what the landlord says about the place. The backend sends one request with the description, the amenities the landlord selected and the photos, and two agents run on it as background jobs:

- **amenities_verify** checks each selected amenity against the photos and says how many of them are verified, citing the photos that show each one.
- **desc_audit** pulls checkable claims out of the description and marks each one `VERIFIED`, `NOT_OBSERVABLE` or `CONTRADICTED` against the photos.

## 1. The VLM

| | |
|---|---|
| Model | `Qwen2.5-VL-3B-Instruct`, Q4_K_M GGUF + `mmproj-model-f16.gguf` (vision projector) |
| Source | Hugging Face `lmstudio-community/Qwen2.5-VL-3B-Instruct-GGUF`, saved to `VLMmodels/` (downloaded at startup if missing) |
| Runtime | LM Studio, OpenAI-compatible server at `http://localhost:1234/v1`, model identifier `qwen2.5-vl-3b-instruct` |
| Output | Every call sends a strict `json_schema` generated from a Pydantic model and validates the reply with the same model. One retry on a bad reply. `temperature=0`, `seed=42`. |

### Endpoints

| Method | Path | What it does | Response |
|---|---|---|---|
| `GET` | `/health` | LM Studio reachable, model loaded, model files on disk | Always `200`; `status` is `ok` or `degraded` |
| `POST` | `/listings/verify` | Starts an **amenities_verify** job and a **desc_audit** job for one listing | `202` with both `job_id`s |
| `GET` | `/listings/{house_id}/verification` | **What the backend polls.** Both jobs rolled into one `verification_status`, with the latest runs attached as `log` | HTTP status = overall `status_code` |
| `GET` | `/jobs/{job_id}` | Polls one job | HTTP status = the job's `status_code` (table below) |
| `GET` | `/docs` | Interactive API docs (FastAPI) | |

Request body (what the backend sends):
```json
{"house_id": 101, "landlord_id": "00000000-0000-0000-0000-000000000301",
 "description": "Mid-century house with a bright living room: sofa, ...",
 "amenities": ["Kitchen access", "Dishwasher", "Study desk", "Garden", "Parking"],
 "photos": [{"photo_id": 41, "position": 0, "content_type": "image/jpeg", "data": "<base64>"}]}
```
Amenities are free text, matched by meaning. A body with missing or wrong-typed fields gets a `422` straight away and no jobs are made.

`verification_status` is `null` until both jobs finish. Then, from the two summaries: **approved** if amenities (verified / selected) and claims (VERIFIED / total) are each at least 2/3 (a side with nothing on it is skipped), **rejected** if nothing at all was verified, otherwise **not_sufficient_data**. A failed job gives status `FAILED` and `not_sufficient_data`.

Status codes returned by polling (each response also carries a one-line `meaning`):

| Code | `status` | Meaning | Extra fields |
|---|---|---|---|
| `202` | `PENDING` | Queued; jobs run one at a time | `submitted_at` |
| `202` | `RUNNING` | Running | `current_step`, `steps` (start/end time of each step) |
| `200` | `COMPLETED` | Done | `result`, `started_at`, `ended_at`, `duration_s` |
| `422` | `FAILED` | `INVALID_LISTING` (no usable photos) or `INVALID_DESCRIPTION` (not 20–2000 chars, desc_audit only) | `error {code, message}` |
| `502` | `FAILED` | `VLM_BAD_OUTPUT`: the model reply didn't match the schema after the retry | `error` |
| `503` | `FAILED` | `VLM_UNAVAILABLE`: LM Studio is down or the model isn't loaded | `error` |
| `500` | `FAILED` | `WORKFLOW_ERROR`: an unexpected error | `error` |
| `404` | — | `JOB_NOT_FOUND`: unknown `job_id`, or `HOUSE_NOT_FOUND` on the verification endpoint | `error` |

## 2. Code structure and flow

```
main.py                     FastAPI app: /health, POST /listings/verify, GET /listings/{house_id}/verification, GET /jobs/{job_id}
src/
  agent/
    amenities_verify.py     AmenitiesVerifyAgent: one VLM call per photo -> verified/not verified per selected amenity
    desc_audit.py           DescAuditAgent: extract claims (text) -> check them one photo at a time -> combine
  models/
    schemas.py              Pydantic models: the request, VLM reply shapes, final results, Job (the log record)
    errors.py               Job errors, each with a code and HTTP status
  prompts/
    amenities_verify.yaml   system + agent prompt with {placeholders}
    desc_audit.yaml         system + extract + agent prompt with {placeholders}
  utils/
    vlmconfig.py            entry point for both agents: LangGraph, prompt stitching, VLM client, photo loader
    model_loader.py         downloads missing GGUF files, then `lms load`s the model once the server is on
    job_tracker.py          assigns job_id; start/end time of the job and of every step
    logger.py               writes logs/<house_id>.json (amenities_verify + desc_audit sections)
    settings.py             reads .env
    verdict.py              overall verification_status from both jobs
logs/                       JSON run logs (git-ignored)
data/                       git-ignored
```

**Flow of one request**

1. `POST /listings/verify` → for each agent `JobTracker` creates a `job_id`, `JobLogger` writes it as `PENDING`, and the job goes to FastAPI background tasks → `202` with both ids.
2. `VlmConfig.run(job, request)` takes a lock, so jobs run one at a time (amenities first), and marks the job `RUNNING`.
3. LangGraph runs the steps. Each step's start and end time goes to the log, which is what polling reads:
   ```
   START → check_vlm → load_listing ─┬─ amenities_verify ───────────────────────→ END
                                     └─ desc_extract ─(any claims?)─ desc_verify → END
   ```
   - `load_listing` takes the photos from the request in `position` order: at most 8 used; each base64-decoded, resized to ≤1024 px and JPEG-encoded.
   - Each agent asks `PromptStitcher` for messages: the YAML `system` prompt plus the agent prompt with its `{placeholders}` filled; images are labelled `Photo <photo_id>:`.
   - `VlmCaller` sends the call with the Pydantic schema and validates the reply. Both agents send one photo per call and combine the answers in code.
4. The result or error is stored in the log, and the job becomes `COMPLETED` or `FAILED`. The two jobs don't depend on each other: a bad description fails only desc_audit.

Order matters. `check_vlm` fails fast before any photo work. `load_listing` must succeed before an agent runs. `desc_verify` only runs if extraction found claims.

**Amenities result**: every selected amenity, in request order. Only verified ones carry `evidence`:
```json
{"house_id": 101,
 "photos_used": [41, 42, 43, 44, 45, 46], "photos_skipped": [],
 "amenities": [
   {"name": "Dishwasher", "verified": true, "evidence": [{"photo_id": 42, "note": "built-in dishwasher"}]},
   {"name": "Balcony", "verified": false}],
 "summary": {"selected": 2, "verified": 1, "not_verified": 1}}
```

**Log file** `logs/101.json`:
```json
{"house_id": 101,
 "amenities_verify": {"runs": [{"house_id": 101, "landlord_id": "…", "job_id": "…", "agent": "amenities_verify",
     "status": "COMPLETED", "status_code": 200, "submitted_at": "…", "started_at": "…", "ended_at": "…",
     "duration_s": 41.2, "steps": {"check_vlm": {"started_at": "…", "ended_at": "…"}, "…": {}},
     "result": {}, "error": null}]},
 "desc_audit": {"runs": []}}
```

## 3. Setup and starting the app

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                       # defaults work as-is
```

LM Studio (CLI `lms`, ships with LM Studio):
```bash
~/.lmstudio/bin/lms bootstrap              # once: puts `lms` on PATH
lms import VLMmodels/lmstudio-community/Qwen2.5-VL-3B-Instruct-GGUF/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf   # once: register the model
lms server start --port 1234               # every session: start the server
```

Start the app:
```bash
python main.py                             # API on http://localhost:8000
```
At startup the app downloads any missing model files. If the server is on, it runs `lms load qwen2.5-vl-3b-instruct --identifier qwen2.5-vl-3b-instruct --context-length 16384`; if the server is off, it prints a warning.

Useful checks:
```bash
lms ps                                     # model loaded, with its identifier
curl localhost:1234/v1/models              # identifier must equal LM_STUDIO_MODEL in .env
lms unload --all && lms server stop        # shut down
```

| Problem | Fix |
|---|---|
| Jobs fail with `VLM_UNAVAILABLE` | Server off (`lms server start`), or the identifier ≠ `LM_STUDIO_MODEL` (`lms ps`) |
| Image calls fail | `mmproj-model-f16.gguf` must sit next to the main GGUF |
| Port in use | `lsof -nP -iTCP:8000 -sTCP:LISTEN`, or change `API_PORT` |

## 4. Using the app

```bash
# send a listing (starts both jobs); request.json is a body like the one in section 1
curl -X POST localhost:8000/listings/verify -H 'Content-Type: application/json' -d @request.json
# -> 202 {"house_id": 101,
#         "jobs": {"amenities_verify": {"job_id": "3f2a…", "status": "PENDING"},
#                  "desc_audit": {"job_id": "9c1b…", "status": "PENDING"}},
#         "status_code": 202, "meaning": "Accepted: the job is queued. Poll for progress.",
#         "poll": "/listings/101/verification"}

# poll the overall result until status is COMPLETED or FAILED
curl localhost:8000/listings/101/verification
# -> {"house_id": 101, "status": "COMPLETED", "status_code": 200, "meaning": "OK: …",
#     "verification_status": "approved", "log": {"amenities_verify": {…}, "desc_audit": {…}}}

# or one job at a time
curl localhost:8000/jobs/<job_id>

curl localhost:8000/health
```

Notes
- Photos and the description are checked when the jobs run, not at submit: a bad photo set gives `202`, then the jobs fail with `422`.
- A 3B model is slow; poll every few seconds.
- If the server stops mid-job, that job stays `RUNNING` in its log. Submit it again.
- `logs/` and `data/` are git-ignored.
