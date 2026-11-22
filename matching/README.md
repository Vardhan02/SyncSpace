# Tenant-side matching (AI)

Ranks the **Houses** grid and the **Roommate** swipe deck for SyncSpace tenants in Cork.
The backend calls it as a small HTTP service; see **[API.md](API.md)** for the contract.

## Quick start

```bash
pip install -r requirements.txt
python train.py          # ~1 min: synthetic data -> both models + calibration -> artifacts/
python evaluate.py       # comparison table -> artifacts/metrics.json, comparison.png
python -m pytest         # 26 tests
uvicorn syncspace_ai.api:app --port 8001   # http://localhost:8001/docs
```

## How a ranking is made

1. **Hard filters (dealbreakers).** These are removed outright: over budget, smoker vs
   non-smoker, pets, lease too long, smaller room than wanted, not available in time, too
   many housemates. For roommates: budgets that don't overlap, smoking, pets.
2. **Signals:**
   - **Rule score**: a transparent weighted score (sleep, cleanliness, noise, social style,
     guests, areas, budget, move-in, interests / budget fit, area, room, timing, house rules,
     amenities).
   - **Two-tower model**:
     - Roommates use a Siamese tower (one shared network for both tenants).
     - Houses use an asymmetric pair (a tenant tower and a house tower).
     - Inputs are the form answers plus a MiniLM (`all-MiniLM-L6-v2`) embedding of the 3
       prompt answers and the bio.
     - Training uses InfoNCE with false-negative masking.
   - **Prompt-text similarity** (roommates only): cosine similarity of the two tenants'
     MiniLM embeddings.
3. **Calibration.** A logistic regression fitted on validation data weights the signals
   (it's learned, not hand-tuned). The result is shown as a 0–100 percentile.
4. **Reasons / cautions**: short strings for the cards, like "Both night owls" or "Over budget".

If `artifacts/` is missing or the text model can't load, the service falls back to the rules
alone (`"mode": "rules"`), so the app never breaks.

## Results (held-out synthetic data)

300 unseen tenants. For houses, also 300 unseen listings. NDCG@10 runs from 0 to 1, where
1 means the top 10 are in the ideal order.

| Roommates | P@5 | P@10 | NDCG@10 |
|---|---|---|---|
| Random | 11.1% | 10.7% | 0.106 |
| Rules only | 74.2% | 67.7% | 0.715 |
| Prompt text only | 64.1% | 54.9% | 0.591 |
| Two-tower only | 88.9% | 86.0% | 0.874 |
| **Final hybrid** | **94.9%** | **91.9%** | **0.934** |

| Houses | P@5 | P@10 | NDCG@10 |
|---|---|---|---|
| Random | 2.4% | 2.4% | 0.034 |
| Rules only | 48.3% | 36.3% | 0.702 |
| Two-tower only | 23.4% | 18.9% | 0.349 |
| **Final hybrid** | **52.0%** | **38.5%** | **0.730** |

House P@10 can't get near 100%, because each tenant has only about 5 good houses out of 300.

### Read these honestly

There's no real user data yet, so "correct" here is a **simulated outcome**
(`syncspace_ai/synth.py`):

- Each synthetic tenant has a hidden persona (quiet studier, social, outdoorsy, night owl
  creative, balanced).
- The persona shapes their answers and writes their prompt text, but the models never see it.
- A pair counts as a good match if it passes the dealbreakers and the rules *plus* the hidden
  persona fit say so.

What the numbers do show:

- **Roommates:** the two-tower learns personality from the prompt text that rules can't
  capture (0.93 vs 0.72).
- **Houses:** matching is mostly rules, and the model adds a little (0.73 vs 0.70) by
  picking up amenity taste from the text.
- **The parts are complementary:** the model alone ignores dealbreakers, and the rules alone
  miss personality. That's why the final system uses both.

What they **don't** show is real-world accuracy. That needs real swipes and likes. Once users
exist, the plan is to retrain the same towers on mutual matches (roommates) and likes
(houses) instead of the simulated outcome.

## Files

| Path | What it is |
|---|---|
| `syncspace_ai/schema.py` | **All fields and allowed values** (Dhruvil's Supabase spec). Change enums here only. |
| `syncspace_ai/prompts.py` | The 10 personality prompts (same ids as the `prompts` table) |
| `syncspace_ai/rules.py` | Hard filters, rule scores, reasons |
| `syncspace_ai/models.py`, `features.py` | Two-tower networks and their inputs |
| `syncspace_ai/recommender.py` | Full ranking pipeline (used by the API and evaluation) |
| `syncspace_ai/api.py` | FastAPI service |
| `syncspace_ai/synth.py` | Synthetic tenants, listings and simulated outcomes |
| `train.py`, `evaluate.py`, `make_examples.py` | Training, comparison, example requests |
| `examples/` | Request bodies for `/rank/roommates` and `/rank/houses` |
| `legacy/` | The first baseline (old field names), kept for reference |

## Still needed from the team

- **Backend:** the real Postgres enum values. They're still guesses in Dhruvil's doc; a
  mismatch shows up as a 422 naming the field.
- **Backend:** call `/rank/houses` and `/rank/roommates`, then use `score` instead of the mock
  `matchScore`.
- **Everyone:** agree on the final area list and the 10 prompts.
