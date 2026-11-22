"""
Compare ranking methods on the held-out test split (unseen tenants and houses).

    python train.py && python evaluate.py

"Correct" = the simulated outcome from syncspace_ai/synth.py (passes dealbreakers AND
the hidden persona fit is good). Writes artifacts/metrics.json and artifacts/comparison.png.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from syncspace_ai.recommender import Recommender  # noqa: E402
from syncspace_ai.schema import House, TenantProfile  # noqa: E402
from syncspace_ai.synth import house_truth, roommate_truth  # noqa: E402
from syncspace_ai.text import load_precomputed  # noqa: E402
from train import ART, DATA, SPLITS_H, SPLITS_T, TODAY, split  # noqa: E402

K = 10


def metrics(score: np.ndarray, truth: np.ndarray, valid: np.ndarray | None = None) -> dict:
    """Precision@5, Precision@K and NDCG@K over queries with at least one good match."""
    s = score.astype(float).copy()
    if valid is not None:
        s[~valid] = -np.inf
    rows = np.where(truth.any(1))[0]
    top = np.argsort(-s[rows], axis=1, kind="stable")[:, :K]
    rel = truth[rows[:, None], top].astype(float)
    disc = 1 / np.log2(np.arange(2, K + 2))
    ideal = np.array([disc[:min(int(n), K)].sum() for n in truth[rows].sum(1)])
    return {"P@5": float(rel[:, :5].mean()), f"P@{K}": float(rel.mean()),
            f"NDCG@{K}": float(((rel * disc).sum(1) / ideal).mean())}


def load():
    tenants = [TenantProfile.model_validate_json(l) for l in (DATA / "tenants.jsonl").read_text(encoding="utf-8").splitlines()]
    houses = [House.model_validate_json(l) for l in (DATA / "houses.jsonl").read_text(encoding="utf-8").splitlines()]
    return tenants, np.load(DATA / "personas.npy"), houses


def main():
    tenants, personas, houses = load()
    tt, pt = tenants[split(SPLITS_T)["test"]], personas[split(SPLITS_T)["test"]]
    ht = houses[split(SPLITS_H)["test"]]
    rec = Recommender(encoder=load_precomputed(DATA / "text_emb.npz"))
    assert rec.mode == "hybrid", "run train.py first"
    rng = np.random.default_rng(0)
    results = {}

    # ---------------- roommates
    truth = roommate_truth(tt, pt, tt, pt)
    t0 = time.time()
    s = rec.roommate_matrix(tt, tt, TODAY)
    per_query_ms = (time.time() - t0) / len(tt) * 1000
    ok = s.hard == 0
    np.fill_diagonal(ok, False)
    no_self = ~np.eye(len(tt), dtype=bool)
    results["roommates"] = {
        "Random": metrics(rng.random(truth.shape), truth, no_self),
        "Rules only (filters + rule score)": metrics(s.signals["rule"], truth, ok),
        "Prompt text only (filters + MiniLM)": metrics(s.signals["text"], truth, ok),
        "Two-tower only (no filters)": metrics(s.signals["model"], truth, no_self),
        "Final hybrid (filters + calibrated blend)": metrics(s.final, truth, ok),
    }
    results["roommates_info"] = {"test_tenants": len(tt), "good_matches_per_tenant": float(truth.sum(1).mean()),
                                 "ms_per_query_precomputed_text": round(per_query_ms, 1)}

    # ---------------- houses
    truth = house_truth(tt, pt, ht)
    s = rec.house_matrix(tt, ht, TODAY)
    ok = s.hard == 0
    results["houses"] = {
        "Random": metrics(rng.random(truth.shape), truth),
        "Rules only (filters + rule score)": metrics(s.signals["rule"], truth, ok),
        "Two-tower only (no filters)": metrics(s.signals["model"], truth),
        "Final hybrid (filters + calibrated blend)": metrics(s.final, truth, ok),
    }
    results["houses_info"] = {"test_tenants": len(tt), "test_houses": len(ht),
                              "good_houses_per_tenant": float(truth.sum(1).mean())}

    (ART / "metrics.json").write_text(json.dumps(results, indent=2))
    for task in ("roommates", "houses"):
        print(f"\n{task.upper()}  ({results[task + '_info']})")
        print(f"  {'method':<45} {'P@5':>7} {'P@10':>7} {'NDCG@10':>8}")
        for name, m in results[task].items():
            print(f"  {name:<45} {m['P@5']:>7.1%} {m['P@10']:>7.1%} {m['NDCG@10']:>8.3f}")

    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for ax, task in zip(axes, ("roommates", "houses")):
        names = list(results[task])
        vals = [results[task][n][f"NDCG@{K}"] for n in names]
        colors = ["#bbbbbb"] * (len(names) - 1) + ["#2b6cb0"]
        ax.barh(range(len(names)), vals, color=colors)
        ax.set_yticks(range(len(names)), [n.split(" (")[0] for n in names])
        ax.invert_yaxis(); ax.set_xlim(0, 1); ax.set_xlabel(f"NDCG@{K} (held-out, synthetic)")
        ax.set_title(task.title())
        for i, v in enumerate(vals):
            ax.text(v + 0.01, i, f"{v:.2f}", va="center")
    fig.tight_layout(); fig.savefig(ART / "comparison.png", dpi=130)
    print(f"\nsaved {ART / 'metrics.json'} and comparison.png")


if __name__ == "__main__":
    main()
