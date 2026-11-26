# Tenant matching

This ranks the Houses grid and the Roommate swipe deck for tenants. The backend calls it
as a small HTTP service, see [API.md](API.md) for the request/response format.

## Running it

```bash
pip install -r requirements.txt
python train.py          # makes synthetic data, trains both models, saves to artifacts/ (~1 min)
python evaluate.py       # prints the comparison table, saves metrics.json + comparison.png
python -m pytest         # 37 tests
uvicorn syncspace_ai.api:app --port 8001   # then open http://localhost:8001/docs
```

## How the ranking works

1. Hard filters - dealbreakers get removed first. For houses: over budget, smoking, pets,
   lease too long, smaller room than wanted, not available in time, too many housemates.
   For roommates: budgets don't overlap, smoking, pets.
2. Then each pair gets a few scores:
   - rule score: weighted score from sleep, cleanliness, noise, social, guests, area,
     budget, move-in date and interests (for houses: budget, area, room, timing,
     house rules, amenities)
   - two-tower model: roommates use one shared tower for both tenants, houses use a
     tenant tower + a house tower. Input is the form answers plus a MiniLM
     (all-MiniLM-L6-v2) embedding of the prompt answers and bio. Trained with InfoNCE.
   - text similarity (roommates only): cosine similarity between the two tenants' text
3. A logistic regression trained on the validation data combines these into one score,
   shown as 0-100.
4. Each result also gets short reasons/cautions for the card, e.g. "Both night owls".

If artifacts/ is missing or the text model doesn't load, it just uses the rule score
(`"mode": "rules"`) so the app still works.

## Results

Tested on 300 tenants (and 300 houses) that weren't used for training.

| Roommates | P@5 | P@10 | NDCG@10 |
|---|---|---|---|
| Random | 11.1% | 10.7% | 0.106 |
| Rules only | 74.2% | 67.7% | 0.715 |
| Text only | 64.1% | 54.9% | 0.591 |
| Two-tower only | 88.9% | 86.0% | 0.874 |
| Final (hybrid) | 94.9% | 91.9% | 0.934 |

| Houses | P@5 | P@10 | NDCG@10 |
|---|---|---|---|
| Random | 2.4% | 2.4% | 0.034 |
| Rules only | 48.3% | 36.3% | 0.702 |
| Two-tower only | 23.4% | 18.9% | 0.349 |
| Final (hybrid) | 52.0% | 38.5% | 0.730 |

House P@10 is low because each tenant only has about 5 good houses out of 300.

Important: this is all synthetic data, we don't have real users yet. In synth.py every
fake tenant has a hidden persona (quiet studier, social, sporty, night owl, balanced) that
shapes their answers, but the model never sees it. A pair counts as a good match if it
passes the filters and the rules + persona fit are high enough.

So what the numbers show:
- roommates: the model picks up personality from the text that the rules miss (0.93 vs 0.72)
- houses: mostly rules, the model only adds a bit (0.73 vs 0.70)
- model alone ignores dealbreakers and rules alone miss personality, so we use both

It doesn't tell us real accuracy. Once people actually use the app we can retrain on real
matches (roommates) and likes (houses).

## Files

| File | What |
|---|---|
| syncspace_ai/schema.py | all fields and allowed values (same as the Supabase enums) |
| syncspace_ai/prompts.py | the 10 personality prompts |
| syncspace_ai/rules.py | filters, rule scores, reasons |
| syncspace_ai/models.py, features.py | two-tower models and their inputs |
| syncspace_ai/recommender.py | the full ranking pipeline |
| syncspace_ai/api.py | FastAPI app |
| syncspace_ai/synth.py | synthetic tenants/houses and the fake labels |
| train.py, evaluate.py, make_examples.py | training, evaluation, example requests |
| examples/ | example requests for both endpoints |
| legacy/ | my first baseline with the old field names |

## TODO

- backend needs to call /rank/houses and /rank/roommates and save the scores into
  house_recommendations / profile_recommendations
- retrain on real swipes and likes once we have them
