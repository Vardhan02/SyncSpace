"""
SyncScape - Compare the roommate Two-Tower against other model families.

Models compared (same held-out students, same teacher labels):
  1. LightGBM                    - gradient-boosted trees on pair features
  2. Pair MLP                    - neural network that sees BOTH students together
  3. Two-Tower (ours)            - neural network, one vector per student

Metrics: Precision@5 (top-5 recommendations that satisfy the teacher rule) and
ms to rank ONE user against 20,000 candidates (speed at scale).

Run (from the matching/ folder):
    pip install lightgbm scikit-learn
    python compare_baselines.py
Outputs: comparison.csv, comparison.png
"""
import time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

try:
    import lightgbm as lgb
    def make_gbm():
        return lgb.LGBMClassifier(n_estimators=200, learning_rate=0.1, num_leaves=31, verbose=-1)
    GBM_NAME = "LightGBM"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    def make_gbm():
        return HistGradientBoostingClassifier(max_iter=200)
    GBM_NAME = "Gradient Boosting (sklearn)"

import train_two_tower as tt   # reuses data generator, teacher rule and model definitions

N_BIG = 20000                  # candidates for the speed test
COLS = ["sleep_schedule", "social_habit", "noise_tolerance", "cleanliness",
        "budget_min", "budget_max", "college"]


# ------------------------------------------------------------ helpers
def arrays(df):
    return {c: df[c].values for c in COLS}


def pair_features(A, txt, ia, ib):
    """Features describing a PAIR of students (what LightGBM sees)."""
    overlap = np.maximum(0, np.minimum(A["budget_max"][ia], A["budget_max"][ib]) -
                            np.maximum(A["budget_min"][ia], A["budget_min"][ib]))
    return np.stack([
        np.abs(A["sleep_schedule"][ia] - A["sleep_schedule"][ib]),
        np.abs(A["social_habit"][ia] - A["social_habit"][ib]),
        np.abs(A["noise_tolerance"][ia] - A["noise_tolerance"][ib]),
        np.abs(A["cleanliness"][ia] - A["cleanliness"][ib]),
        overlap,
        (A["college"][ia] == A["college"][ib]).astype(float),
        (txt[ia] * txt[ib]).sum(1),                      # text similarity of the prompts
    ], axis=1).astype(np.float32)


def precision_at_5(S, compat):
    S = S.copy()
    np.fill_diagonal(S, -1e9)
    top5 = np.argsort(-S, axis=1)[:, :5]
    users = np.where(compat.any(1))[0]
    return float(np.mean([compat[i, top5[i]].mean() for i in users]))


def pair_score_matrix(model, A, txt, n):
    ia, ib = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    ia, ib = ia.ravel(), ib.ravel()
    p = model.predict_proba(pair_features(A, txt, ia, ib))[:, 1]
    return p.reshape(n, n)


def time_ms(fn, reps=15):
    fn()                                     # warm-up
    ts = []
    for _ in range(reps):
        t0 = time.perf_counter(); fn(); ts.append((time.perf_counter() - t0) * 1000)
    return float(np.median(ts))


def student_matrix(df, txt):
    """One row per student: one-hot categories + scaled numbers + 384-d text vector."""
    oh = [np.eye(3)[df[c].values] for c in ["sleep_schedule", "social_habit", "noise_tolerance"]]
    num = np.stack([(df.cleanliness.values - 1) / 4, (df.budget_min.values - 450) / 550,
                    (df.budget_max.values - 450) / 550], axis=1)
    return np.concatenate(oh + [num, txt], axis=1).astype(np.float32)


class PairMLP(nn.Module):
    """Cross-style model: sees both students together. Symmetric by construction (|a-b| and a*b)."""
    def __init__(self, d):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(2 * d, 256), nn.ReLU(), nn.Dropout(0.1),
                                 nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, 1))

    def forward(self, fa, fb):
        return self.net(torch.cat([(fa - fb).abs(), fa * fb], dim=-1)).squeeze(-1)


def train_pair_mlp(F_tr, ia, ib, y, epochs=15, batch=512):
    Ft = torch.tensor(F_tr)
    ia_t, ib_t, y_t = torch.as_tensor(ia), torch.as_tensor(ib), torch.tensor(y, dtype=torch.float32)
    model = PairMLP(F_tr.shape[1])
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    lossf = nn.BCEWithLogitsLoss()
    for ep in range(epochs):
        model.train()
        perm = torch.randperm(len(y_t))
        for s in range(0, len(perm), batch):
            idx = perm[s:s + batch]
            loss = lossf(model(Ft[ia_t[idx]], Ft[ib_t[idx]]), y_t[idx])
            opt.zero_grad(); loss.backward(); opt.step()
    return model.eval()


def train_two_tower(train_df, epochs=40, batch_size=128):
    T = tt.to_tensors(train_df)
    pairs = tt.make_pairs(tt.compat_matrix(train_df))
    model = tt.TwoTower()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    for ep in range(epochs):
        model.train()
        perm = np.random.permutation(len(pairs))
        for s in range(0, len(perm), batch_size):
            b = pairs[perm[s:s + batch_size]]
            if len(b) < 8:
                continue
            ia, ib = torch.tensor(b[:, 0]), torch.tensor(b[:, 1])
            loss = tt.info_nce(model(tt.take(T, ia), tt.take(T, ib)), ia, ib)
            opt.zero_grad(); loss.backward(); opt.step()
    return model


# ------------------------------------------------------------ main
def main():
    df = tt.generate_students(1000)
    train_df, test_df = df.iloc[:800].reset_index(drop=True), df.iloc[800:].reset_index(drop=True)
    txt_tr, txt_te = tt.embed_texts(train_df.prompt_text.tolist()), tt.embed_texts(test_df.prompt_text.tolist())
    A_tr, A_te = arrays(train_df), arrays(test_df)
    compat_tr, compat_te = tt.compat_matrix(train_df), tt.compat_matrix(test_df)
    n = len(test_df)
    results = []

    # pair-model training set: random pairs from TRAIN students, label = teacher rule
    rng = np.random.default_rng(0)
    ia = rng.integers(0, len(train_df), 60000); ib = rng.integers(0, len(train_df), 60000)
    keep = ia != ib
    ia, ib = ia[keep], ib[keep]
    Xp, yp = pair_features(A_tr, txt_tr, ia, ib), compat_tr[ia, ib].astype(int)
    print(f"pair-model training set: {len(yp)} pairs, {yp.mean():.1%} positive")

    # ia/ib for the speed test: one user vs N_BIG candidates
    big_a = np.zeros(N_BIG, dtype=int); big_b = np.tile(np.arange(n), N_BIG // n)

    # 1. LightGBM (gradient-boosted trees on pair features)
    for name, mdl in [(GBM_NAME, make_gbm())]:
        mdl.fit(Xp, yp)
        acc = precision_at_5(pair_score_matrix(mdl, A_te, txt_te, n), compat_te)
        ms = time_ms(lambda: np.argsort(-mdl.predict_proba(pair_features(A_te, txt_te, big_a, big_b))[:, 1])[:5])
        results.append((name, acc, ms))

    # 2. Pair MLP (neural network that scores each PAIR)
    print("training pair MLP...")
    F_tr, F_te = student_matrix(train_df, txt_tr), torch.tensor(student_matrix(test_df, txt_te))
    mlp = train_pair_mlp(F_tr, ia, ib, yp)
    g_a, g_b = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    with torch.no_grad():
        S = mlp(F_te[g_a.ravel()], F_te[g_b.ravel()]).reshape(n, n).numpy()
        Fbig, f0 = F_te.repeat(N_BIG // n, 1), F_te[0:1]
        ms = time_ms(lambda: torch.topk(mlp(f0.expand(N_BIG, -1), Fbig), 5))
    results.append(("Pair MLP (neural, scores each pair)", precision_at_5(S, compat_te), ms))

    # 3. Two-Tower
    print("training two-tower (40 epochs)...")
    model = train_two_tower(train_df)
    model.eval()
    Tte = tt.to_tensors(test_df)
    with torch.no_grad():
        U = model.tower(Tte).numpy()
    Ubig = np.tile(U, (N_BIG // n, 1)); u0 = U[0]            # vectors are precomputed in production
    results.append(("Two-Tower (ours)", precision_at_5(U @ U.T, compat_te),
                    time_ms(lambda: np.argsort(-(Ubig @ u0))[:5])))

    # ---- report
    out = pd.DataFrame(results, columns=["Model", "Precision@5", f"ms to rank 1 user vs {N_BIG:,}"])
    out["Precision@5"] = (out["Precision@5"] * 100).round(1)
    out.iloc[:, 2] = out.iloc[:, 2].astype(float).round(2)
    print("\n" + out.to_string(index=False))
    out.to_csv("comparison.csv", index=False)

    fig, ax = plt.subplots(1, 2, figsize=(11, 3.8))
    ax[0].barh(out["Model"], out["Precision@5"]); ax[0].set_xlabel("Precision@5 (%)"); ax[0].set_title("Accuracy")
    sp = out.dropna(subset=[out.columns[2]])
    ax[1].barh(sp["Model"], sp.iloc[:, 2]); ax[1].set_xscale("log")
    ax[1].set_xlabel(f"ms per user vs {N_BIG:,} candidates (log, lower is better)"); ax[1].set_title("Speed")
    plt.tight_layout(); plt.savefig("comparison.png", dpi=150)
    print("\nSaved comparison.csv, comparison.png")


if __name__ == "__main__":
    main()
