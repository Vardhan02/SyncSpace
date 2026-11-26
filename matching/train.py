# Trains the roommate + house two-tower models and the calibration on synthetic data.
# python train.py   (takes 1-2 min on my laptop)
# Saves data to data/ and models to artifacts/. Run evaluate.py after.

import json
import random
import subprocess
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.linear_model import LogisticRegression

from syncspace_ai import models as M
from syncspace_ai.arrays import house_arrays, tenant_arrays
from syncspace_ai.features import HOUSE_DIM, TENANT_DIM, house_features, tenant_features
from syncspace_ai.recommender import HOUSE_SIGNALS, ROOMMATE_SIGNALS, Recommender
from syncspace_ai.synth import generate_houses, generate_tenants, house_truth, roommate_truth
from syncspace_ai.text import load_precomputed

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
ART = ROOT / "artifacts"
SEED = 42
TODAY = date(2026, 12, 1)   # fixed date so every run gives the same data
SPLITS_T = {"train": 1500, "val": 300, "test": 300}
SPLITS_H = {"train": 1200, "val": 300, "test": 300}


def split(sizes):
    out, i = {}, 0
    for name, n in sizes.items():
        out[name] = slice(i, i + n)
        i += n
    return out


def build_data():
    tenants, personas = generate_tenants(sum(SPLITS_T.values()), TODAY, seed=SEED)
    houses = generate_houses(sum(SPLITS_H.values()), TODAY, seed=SEED + 1)
    DATA.mkdir(exist_ok=True)
    (DATA / "tenants.jsonl").write_text("\n".join(t.model_dump_json() for t in tenants), encoding="utf-8")
    (DATA / "houses.jsonl").write_text("\n".join(h.model_dump_json() for h in houses), encoding="utf-8")
    np.save(DATA / "personas.npy", personas)
    return tenants, personas, houses


def precision_at_k(sim, truth, k=10, valid=None):
    if valid is not None:
        sim = np.where(valid, sim, -np.inf)
    rows = np.where(truth.any(1))[0]
    top = np.argsort(-sim[rows], axis=1)[:, :k]
    return float(np.mean(truth[rows[:, None], top]))


def train_roommate(X, truth, Xv, truth_v, epochs=40, batch=256, lr=1e-3):
    model = M.RoommateModel(TENANT_DIM)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    pos = [np.where(r)[0] for r in truth]
    users = np.array([i for i, p in enumerate(pos) if len(p)])
    X, Xv = torch.from_numpy(X), torch.from_numpy(Xv)
    hist, best = [], (-1.0, None)
    for ep in range(epochs):
        model.train()
        np.random.shuffle(users)
        losses = []
        for s in range(0, len(users), batch):
            ia = users[s:s + batch]
            if len(ia) < 16:
                continue
            ib = np.array([np.random.choice(pos[i]) for i in ia])
            sim = model.embed(X[ia]) @ model.embed(X[ib]).T * model.scale()
            fn = torch.from_numpy(truth[ia][:, ib]) & ~torch.eye(len(ia), dtype=torch.bool)
            loss = M.info_nce(sim, fn)
            opt.zero_grad(); loss.backward(); opt.step()
            losses.append(loss.item())
        model.eval()
        with torch.no_grad():
            e = model.embed(Xv)
        sim_v = (e @ e.T).numpy()
        np.fill_diagonal(sim_v, -np.inf)
        p10 = precision_at_k(sim_v, truth_v)
        hist.append((float(np.mean(losses)), p10))
        if p10 > best[0]:
            best = (p10, {k: v.clone() for k, v in model.state_dict().items()})
        if ep % 5 == 0 or ep == epochs - 1:
            print(f"  roommate epoch {ep:02d}  loss {hist[-1][0]:.3f}  val P@10 {p10:.1%}")
    model.load_state_dict(best[1])
    return model.eval(), hist


def train_house(XT, XH, truth, XTv, XHv, truth_v, epochs=60, batch=256, lr=1e-3):
    model = M.HouseModel(TENANT_DIM, HOUSE_DIM)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    pos = [np.where(r)[0] for r in truth]
    users = np.array([i for i, p in enumerate(pos) if len(p)])
    XT, XH, XTv, XHv = map(torch.from_numpy, (XT, XH, XTv, XHv))
    hist, best = [], (-1.0, None)
    for ep in range(epochs):
        model.train()
        np.random.shuffle(users)
        losses = []
        for s in range(0, len(users), batch):
            ti = users[s:s + batch]
            if len(ti) < 16:
                continue
            hj = np.array([np.random.choice(pos[i]) for i in ti])
            sim = model.tenant_tower(XT[ti]) @ model.house_tower(XH[hj]).T * model.scale()
            fn = torch.from_numpy(truth[ti][:, hj]) & ~torch.eye(len(ti), dtype=torch.bool)
            loss = M.info_nce(sim, fn)
            opt.zero_grad(); loss.backward(); opt.step()
            losses.append(loss.item())
        model.eval()
        with torch.no_grad():
            sim_v = (model.tenant_tower(XTv) @ model.house_tower(XHv).T).numpy()
        p10 = precision_at_k(sim_v, truth_v)
        hist.append((float(np.mean(losses)), p10))
        if p10 > best[0]:
            best = (p10, {k: v.clone() for k, v in model.state_dict().items()})
        if ep % 10 == 0 or ep == epochs - 1:
            print(f"  house    epoch {ep:02d}  loss {hist[-1][0]:.3f}  val P@10 {p10:.1%}")
    model.load_state_dict(best[1])
    return model.eval(), hist


def fit_calibration(signals, valid, truth, names):
    # logistic regression on val pairs that pass the filters,
    # plus percentiles to turn the score into 0-100 for the UI
    X = np.stack([signals[n][valid] for n in names], axis=1)
    y = truth[valid]
    lr = LogisticRegression(C=1.0, max_iter=1000).fit(X, y)
    coef, intercept = lr.coef_[0].round(4), round(float(lr.intercept_[0]), 4)
    logit = intercept + X @ coef
    pct = np.linspace(0, 1, 101)
    return {"features": names, "coef": coef.tolist(), "intercept": intercept,
            "val_positive_rate": round(float(y.mean()), 4),
            "logit_quantiles": np.quantile(logit, pct).round(4).tolist(),
            "rule_quantiles": np.quantile(signals["rule"][valid], pct).round(4).tolist()}


def main():
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    t0 = time.time()
    tenants, personas, houses = build_data()
    st, sh = split(SPLITS_T), split(SPLITS_H)
    T = {k: tenants[v] for k, v in st.items()}
    P = {k: personas[v] for k, v in st.items()}
    H = {k: houses[v] for k, v in sh.items()}
    print(f"data: {len(tenants)} tenants, {len(houses)} houses  ({time.time() - t0:.0f}s)")

    # embed the text in a separate process (saves memory), reuse the file if it's already there
    emb = DATA / "text_emb.npz"
    try:
        rec = Recommender(use_models=False, encoder=load_precomputed(emb))
        text_all = rec.encode_text(tenants)
    except (OSError, KeyError):
        subprocess.run([sys.executable, "-m", "syncspace_ai.text", str(DATA / "tenants.jsonl"),
                        str(emb)], check=True, cwd=ROOT)
        rec = Recommender(use_models=False, encoder=load_precomputed(emb))
        text_all = rec.encode_text(tenants)
    TXT = {k: text_all[v] for k, v in st.items()}
    print(f"encoded prompt text ({time.time() - t0:.0f}s)")

    feats = {k: tenant_features(tenant_arrays(T[k]), TXT[k], TODAY.toordinal()) for k in T}
    hfeats = {k: house_features(house_arrays(H[k]), TODAY.toordinal()) for k in H}
    rt = {k: roommate_truth(T[k], P[k], T[k], P[k]) for k in ("train", "val")}
    ht = {k: house_truth(T[k], P[k], H[k]) for k in ("train", "val")}
    print(f"roommate positives/user (train) {rt['train'].sum(1).mean():.0f} | "
          f"house positives/user (train) {ht['train'].sum(1).mean():.1f}")

    print("training roommate two-tower")
    rm, rm_hist = train_roommate(feats["train"], rt["train"], feats["val"], rt["val"])
    print("training house two-tower")
    hm, hm_hist = train_house(feats["train"], hfeats["train"], ht["train"],
                              feats["val"], hfeats["val"], ht["val"])

    # calibration on the val split
    rec.roommate_model, rec.house_model = rm, hm
    identity = {"features": ["rule"], "coef": [1.0], "intercept": 0.0}
    rec.calibration = {"roommate": identity, "house": identity}
    sr = rec.roommate_matrix(T["val"], T["val"], TODAY, TXT["val"], TXT["val"])
    valid_r = sr.hard == 0
    np.fill_diagonal(valid_r, False)
    sh_ = rec.house_matrix(T["val"], H["val"], TODAY, TXT["val"])
    calibration = {
        "roommate": fit_calibration(sr.signals, valid_r, rt["val"], ROOMMATE_SIGNALS),
        "house": fit_calibration(sh_.signals, sh_.hard == 0, ht["val"], HOUSE_SIGNALS),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "reference_date": TODAY.isoformat(),
        "seed": SEED,
    }
    for k in ("roommate", "house"):
        c = calibration[k]
        print(f"calibration {k}: features={c['features']} coef={c['coef']} intercept={c['intercept']}")

    ART.mkdir(exist_ok=True)
    M.save(rm, ART / "roommate_model.pt")
    M.save(hm, ART / "house_model.pt")
    (ART / "calibration.json").write_text(json.dumps(calibration, indent=2))

    fig, ax = plt.subplots(1, 2, figsize=(10, 3.5))
    for a, hist, title in ((ax[0], rm_hist, "Roommate two-tower"), (ax[1], hm_hist, "House two-tower")):
        a.plot([h[0] for h in hist], label="train loss")
        a2 = a.twinx()
        a2.plot([h[1] for h in hist], color="tab:orange", label="val P@10")
        a.set_title(title); a.set_xlabel("epoch"); a.set_ylabel("InfoNCE loss"); a2.set_ylabel("val P@10")
        a.grid(alpha=.3)
    fig.tight_layout(); fig.savefig(ART / "training_curves.png", dpi=130)
    print(f"saved artifacts to {ART}  (total {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
