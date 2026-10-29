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

## Next steps
- Fine-tune on real swipes once users exist.
- Personality prompts (3 of 10) feeding the text embedding.
- House ranking tower (tenant <-> listing).

See `two_tower_recommender_guide.md` for the full design.
