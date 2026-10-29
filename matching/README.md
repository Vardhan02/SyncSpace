# Roommate Matching (Two-Tower) - Tenant-side AI

Cold-start roommate recommender for SyncScape (Cork students).

## What it does
- Generates 1,000 synthetic Cork student profiles (no real swipe data yet).
- Labels compatible pairs with a rule-based "teacher" (budget overlap, cleanliness +/-1,
  same social habit, sleep within 1).
- Trains a Siamese two-tower network (PyTorch) with InfoNCE loss.
  Text prompts are encoded with `all-MiniLM-L6-v2` (384-d); each student becomes a 128-d vector.
- Compatibility score = cosine similarity, shown as a percentage.

## Run
```
pip install -r requirements.txt
python train_two_tower.py
```
Outputs: `loss_curve.png`, `tower.pt`, `embeddings.npy` (the last two are git-ignored).

## Results (held-out users)
- Precision@5 (rule-compatible): ~96% vs ~9.5% random baseline.

## House ranking (Tenant <-> Listing)
`python train_house_ranking.py` - asymmetric two-tower (separate tenant and listing towers)
trained on synthetic Cork listings. Field list is ASSUMED until the team finalises
the house-preference fields.

## Personality prompts
`prompts.py` holds the draft bank of 10 prompts (tenants answer 3) and `build_prompt_text()`,
which turns the 3 answers into the string embedded by the roommate model.

## Model comparison
`python compare_baselines.py` compares the roommate two-tower with LightGBM
and a Pair MLP on accuracy (Precision@5) and ranking speed. Outputs `comparison.csv` / `comparison.png`.

## Next steps
- Fine-tune both models on real swipes/likes once users exist.
- Team to approve the 10 prompts and the house-preference fields.
- Wrap `get_recommendations(user_id, k)` as an API for the backend.

See `two_tower_recommender_guide.md` for the full design.
