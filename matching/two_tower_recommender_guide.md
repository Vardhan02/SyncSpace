# Two-tower matching - design notes

My notes on how the roommate/house matching model works and why I built it this way.

## The problem

Roommate matching is reciprocal: both people have to like each other (not like Netflix
where only the user decides). So the score for A and B should be symmetric.

The other problem is cold start. When the app launches there are 0 swipes, so there's
nothing real to train on.

## Plan for cold start

1. Generate synthetic Cork tenants and houses (synth.py). Each fake tenant has a hidden
   persona (quiet studier, balanced, social, sporty, night owl) which decides their
   answers, prompt text and bio.
2. Make fake labels: a pair is a "good match" if it passes the dealbreakers and the rules +
   hidden persona fit are high enough. The model never sees the persona, so to do well it
   has to learn it from the text.
3. Train the two-tower models on that and use them in the app.
4. Once people use the app, every mutual right swipe (and house like) is a real label, so
   retrain on those.

## Model

Roommates use one shared tower for both tenants (Siamese), since both sides are tenants.
That also makes the score symmetric.

```
Tenant A features                 Tenant B features
(form answers + 384-d text)       (form answers + 384-d text)
        |                                 |
   shared tower                      shared tower
        |                                 |
   64-d vector                       64-d vector
        \_______________ ________________/
                        |
               cosine similarity
```

Houses use two different towers (tenant tower and house tower) because the inputs are
different.

Tower = Linear(256) -> LayerNorm -> ReLU -> Dropout(0.1) -> Linear(128) -> ReLU ->
Linear(64), then L2-normalize so the dot product is cosine similarity.

Tenant input: areas, room type, sleep, cleanliness, work, social, guests (one-hot), budget,
move-in, lease, housemates, noise, age, smoking/pets flags, plus the MiniLM embedding of
the 3 prompt answers + bio.

House input: area, room type, rent, rooms available, available date, 15 amenities,
pets/smoking, guest policy, quiet hours, min lease, max occupants, preferred tenants.

## Training

InfoNCE with in-batch negatives: in a batch of (tenant, good match) pairs, every other
pair in the batch is treated as a negative. Since a lot of those "negatives" are actually
good matches too, I mask them out (false-negative masking) so the model doesn't push
compatible people apart. Temperature is learned.

Roommate model: 40 epochs, house model: 60, AdamW lr 1e-3, batch 256. Keeps the epoch
with the best validation P@10.

## Why not just the model

The model alone doesn't respect dealbreakers (it might rank a smoker for someone who
said no smoking). The rules alone miss personality. So the final ranking is:

1. hard filters remove dealbreakers
2. rule score + model similarity + text similarity
3. logistic regression on validation data combines them into one score (0-100)

Results are in README.md.
