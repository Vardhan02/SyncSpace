"""
SyncScape - Two-Tower roommate matcher (cold-start demo)
Run:  pip install torch pandas numpy matplotlib sentence-transformers
      python train_two_tower.py
Outputs: loss_curve.png, tower.pt, embeddings.npy, console metrics + demo recommendations.
"""
import random
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

# ---------------------------------------------------------------- 1. Synthetic Cork students
PROMPTS = {
    0: ["I prefer quiet study evenings, tea, and early nights.",
        "Library regular. Quiet after 9pm and a tidy kitchen make me happy.",
        "Homebody who loves baking and a good book on a rainy Cork night.",
        "I study for hospital rounds until 10 PM and keep things calm."],
    1: ["Social at weekends but strict quiet study hours on weekdays.",
        "Happy to cook together and watch a film, but I need sleep before lectures.",
        "Gym in the morning, coffee with friends, chill evenings.",
        "Balanced: some nights out, some nights in."],
    2: ["Love weekend drinks, music, cooking together, and having friends over.",
        "Always up for a night out on Oliver Plunkett Street and house parties.",
        "Big on gigs, society events and late-night chats in the kitchen.",
        "Sociable and loud-ish, my door is always open to friends."],
}


def generate_students(n=1000):
    rows = []
    for i in range(n):
        social = random.choice([0, 1, 2])
        bmin = random.randint(450, 850)
        rows.append({
            "user_id": i,
            "college": random.choice(["UCC", "MTU"]),
            "budget_min": bmin,
            "budget_max": bmin + random.randint(100, 250),
            "sleep_schedule": random.choice([0, 1, 2]),   # 0 early bird, 2 night owl
            "social_habit": social,                        # 0 homebody, 2 party
            "noise_tolerance": random.choice([0, 1, 2]),
            "cleanliness": random.randint(1, 5),
            "prompt_text": random.choice(PROMPTS[social]),
        })
    return pd.DataFrame(rows)


def compat_matrix(df):
    """Teacher rule (pseudo-labels): budget overlap, cleanliness +/-1, same social habit, sleep within 1."""
    bmin, bmax = df.budget_min.values, df.budget_max.values
    clean, soc, slp = df.cleanliness.values, df.social_habit.values, df.sleep_schedule.values
    ok = (bmin[:, None] <= bmax[None, :]) & (bmax[:, None] >= bmin[None, :])
    ok &= np.abs(clean[:, None] - clean[None, :]) <= 1
    ok &= soc[:, None] == soc[None, :]
    ok &= np.abs(slp[:, None] - slp[None, :]) <= 1
    np.fill_diagonal(ok, False)
    return ok


def make_pairs(compat):
    pairs = []
    for i in range(compat.shape[0]):
        cands = np.where(compat[i])[0]
        if len(cands):
            pairs.append((i, int(np.random.choice(cands))))
    return np.array(pairs)


def embed_texts(texts):
    uniq = sorted(set(texts))
    try:
        from sentence_transformers import SentenceTransformer
        vecs = SentenceTransformer("all-MiniLM-L6-v2").encode(uniq, normalize_embeddings=True)
    except Exception as e:
        print(f"[warn] sentence-transformers unavailable ({e}); using random text vectors.")
        vecs = np.random.default_rng(0).normal(size=(len(uniq), 384))
        vecs /= np.linalg.norm(vecs, axis=1, keepdims=True)
    lookup = dict(zip(uniq, vecs))
    return np.stack([lookup[t] for t in texts]).astype(np.float32)


def to_tensors(df):
    cat = {"sleep": torch.tensor(df.sleep_schedule.values, dtype=torch.long),
           "social": torch.tensor(df.social_habit.values, dtype=torch.long),
           "noise": torch.tensor(df.noise_tolerance.values, dtype=torch.long)}
    cont = torch.tensor(np.stack([(df.budget_min.values - 450) / 550,
                                  (df.budget_max.values - 450) / 550,
                                  (df.cleanliness.values - 1) / 4], axis=1), dtype=torch.float32)
    text = torch.tensor(embed_texts(df.prompt_text.tolist()))
    return {"cat": cat, "cont": cont, "text": text}


def take(T, idx):
    idx = torch.as_tensor(idx, dtype=torch.long)
    return {"cat": {k: v[idx] for k, v in T["cat"].items()}, "cont": T["cont"][idx], "text": T["text"][idx]}


# ---------------------------------------------------------------- 2. Model
class RoommateTower(nn.Module):
    def __init__(self, cards=None, emb_dim=8, n_cont=3, text_dim=384, out_dim=128):
        super().__init__()
        cards = cards or {"sleep": 3, "social": 3, "noise": 3}
        self.cat_emb = nn.ModuleDict({k: nn.Embedding(c, emb_dim) for k, c in cards.items()})
        in_dim = len(cards) * emb_dim + n_cont + text_dim
        self.mlp = nn.Sequential(
            nn.Linear(in_dim, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.1),
            nn.Linear(256, out_dim))

    def forward(self, d):
        cats = torch.cat([self.cat_emb[k](d["cat"][k]) for k in self.cat_emb], dim=-1)
        x = torch.cat([cats, d["cont"], d["text"]], dim=-1)
        return F.normalize(self.mlp(x), dim=-1)


class TwoTower(nn.Module):
    """Siamese: both users are tenants, so one shared tower."""
    def __init__(self):
        super().__init__()
        self.tower = RoommateTower()
        self.log_scale = nn.Parameter(torch.tensor(np.log(1 / 0.07), dtype=torch.float32))

    def forward(self, a, b):
        ua, ub = self.tower(a), self.tower(b)
        return ua @ ub.T * self.log_scale.exp().clamp(max=100)


def info_nce(sim, ia, ib):
    """Symmetric InfoNCE; masks duplicate users in a batch so they are not treated as negatives."""
    n = sim.size(0)
    labels = torch.arange(n)
    eye = torch.eye(n, dtype=torch.bool)
    dup_b = (ib[:, None] == ib[None, :]) & ~eye
    dup_a = (ia[:, None] == ia[None, :]) & ~eye
    la = F.cross_entropy(sim.masked_fill(dup_b, -1e9), labels)
    lb = F.cross_entropy(sim.T.masked_fill(dup_a, -1e9), labels)
    return (la + lb) / 2


# ---------------------------------------------------------------- 3. Train + evaluate
def main(epochs=40, batch_size=128, lr=1e-3):
    df = generate_students(1000)
    train_df = df.iloc[:800].reset_index(drop=True)
    test_df = df.iloc[800:].reset_index(drop=True)      # unseen users

    Ttr, Tte = to_tensors(train_df), to_tensors(test_df)
    pairs = make_pairs(compat_matrix(train_df))
    print(f"train users: {len(train_df)} | pseudo-labeled positive pairs: {len(pairs)}")

    model = TwoTower()
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    history = []

    for ep in range(epochs):
        model.train()
        perm = np.random.permutation(len(pairs))
        losses = []
        for s in range(0, len(perm), batch_size):
            b = pairs[perm[s:s + batch_size]]
            if len(b) < 8:
                continue
            ia, ib = torch.tensor(b[:, 0]), torch.tensor(b[:, 1])
            sim = model(take(Ttr, ia), take(Ttr, ib))
            loss = info_nce(sim, ia, ib)
            opt.zero_grad(); loss.backward(); opt.step()
            losses.append(loss.item())
        history.append(float(np.mean(losses)))
        if ep % 5 == 0 or ep == epochs - 1:
            print(f"epoch {ep:02d}  loss {history[-1]:.4f}")

    # --- evaluation on held-out users: do top-5 recommendations satisfy the teacher rule?
    model.eval()
    with torch.no_grad():
        U = model.tower(Tte)
    sim = (U @ U.T).numpy()
    np.fill_diagonal(sim, -9)
    compat = compat_matrix(test_df)
    has_pos = compat.any(axis=1)
    top5 = np.argsort(-sim, axis=1)[:, :5]
    prec5 = np.mean([compat[i, top5[i]].mean() for i in np.where(has_pos)[0]])
    random_baseline = compat[has_pos].sum(1).mean() / (len(test_df) - 1)
    print(f"\nHeld-out precision@5 (rule-compatible): {prec5:.1%}  vs random baseline {random_baseline:.1%}")

    # --- demo: recommendations for one user
    u = 0
    print("\nDemo - top 5 matches for test user 0")
    cols = ["college", "budget_min", "budget_max", "sleep_schedule", "social_habit", "cleanliness"]
    print("QUERY:", test_df.loc[u, cols].to_dict())
    for j in top5[u]:
        score = (sim[u, j] + 1) / 2 * 100
        print(f"  {score:5.1f}%  rule-compatible={compat[u, j]}  {test_df.loc[j, cols].to_dict()}")

    # --- artifacts
    plt.figure(figsize=(6, 3.5))
    plt.plot(history, marker="o", ms=3)
    plt.xlabel("epoch"); plt.ylabel("InfoNCE loss"); plt.title("Two-Tower training loss")
    plt.grid(alpha=.3); plt.tight_layout(); plt.savefig("loss_curve.png", dpi=150)
    torch.save(model.state_dict(), "tower.pt")
    np.save("embeddings.npy", U.numpy())
    print("\nSaved loss_curve.png, tower.pt, embeddings.npy")


if __name__ == "__main__":
    main()
