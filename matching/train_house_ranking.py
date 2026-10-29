"""
SyncScape - House ranking (Tenant <-> Listing) two-tower, cold-start demo.

Unlike the roommate model, the two sides are DIFFERENT kinds of objects (a person vs a
listing), so this is an ASYMMETRIC two-tower: separate towers, separate weights.

NOTE: the house-preference field list is still TBD in the project doc, so the fields
below are ASSUMED. Change them once the team confirms.

Run:  python train_house_ranking.py
Out:  house_loss_curve.png, house_tower.pt, console metrics + demo recommendations
"""
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

AREAS = ["City Centre", "Bishopstown", "Wilton", "Douglas", "Ballincollig",
         "Blackrock", "Mahon", "Glanmire", "Togher", "Model Farm Rd"]
ROOMS = ["single", "double", "ensuite", "shared"]
N_AREAS, N_ROOMS = len(AREAS), len(ROOMS)
AREA_PREMIUM = [90, 40, 30, 10, 0, 20, 10, -20, -10, 0]
ROOM_BASE = [650, 560, 760, 450]

N_TENANTS, N_LISTINGS = 1000, 3000
N_TR_T, N_TR_L = 800, 2200          # first 800 tenants / 2200 listings train, rest held out


# ---------------------------------------------------------------- 1. Synthetic data (ASSUMED fields)
def generate_listings(n):
    rows = []
    for i in range(n):
        area, room = random.randrange(N_AREAS), random.randrange(N_ROOMS)
        rent = int(np.clip(np.random.normal(ROOM_BASE[room] + AREA_PREMIUM[area], 90), 350, 1100))
        rows.append(dict(area=area, room=room, rent=rent,
                         available_day=random.randint(0, 90),        # days from today
                         min_lease=random.choice([6, 9, 12]),        # months
                         housemates=random.randint(1, 5)))
    return rows


def generate_tenants(n):
    rows = []
    for i in range(n):
        bmin = random.randint(400, 800)
        rows.append(dict(budget_min=bmin, budget_max=bmin + random.randint(100, 300),
                         areas=random.sample(range(N_AREAS), random.choice([1, 2, 3])),
                         rooms=random.sample(range(N_ROOMS), random.choice([1, 2])),
                         move_in_day=random.randint(0, 60),
                         lease=random.choice([6, 9, 12]),            # longest lease they accept
                         max_housemates=random.randint(1, 5)))
    return rows


def compat_matrix(tenants, listings):
    """Teacher rule: area & room type acceptable, rent in budget, available in time,
    lease and housemate count acceptable."""
    bmin = np.array([t["budget_min"] for t in tenants]); bmax = np.array([t["budget_max"] for t in tenants])
    t_areas = np.zeros((len(tenants), N_AREAS), bool); t_rooms = np.zeros((len(tenants), N_ROOMS), bool)
    for i, t in enumerate(tenants):
        t_areas[i, t["areas"]] = True; t_rooms[i, t["rooms"]] = True
    t_move = np.array([t["move_in_day"] for t in tenants]); t_lease = np.array([t["lease"] for t in tenants])
    t_hm = np.array([t["max_housemates"] for t in tenants])

    l_area = np.array([l["area"] for l in listings]); l_room = np.array([l["room"] for l in listings])
    l_rent = np.array([l["rent"] for l in listings]); l_avail = np.array([l["available_day"] for l in listings])
    l_lease = np.array([l["min_lease"] for l in listings]); l_hm = np.array([l["housemates"] for l in listings])

    ok = t_areas[:, l_area] & t_rooms[:, l_room]
    ok &= (l_rent[None, :] <= bmax[:, None]) & (l_rent[None, :] >= bmin[:, None] - 150)
    ok &= l_avail[None, :] <= t_move[:, None] + 21
    ok &= l_lease[None, :] <= t_lease[:, None]
    ok &= l_hm[None, :] <= t_hm[:, None]
    return ok


def tenant_features(tenants):
    X = []
    for t in tenants:
        areas = np.zeros(N_AREAS); areas[t["areas"]] = 1
        rooms = np.zeros(N_ROOMS); rooms[t["rooms"]] = 1
        X.append(np.concatenate([areas, rooms, [(t["budget_min"] - 400) / 700, (t["budget_max"] - 400) / 700,
                                                t["move_in_day"] / 90, t["lease"] / 12, t["max_housemates"] / 5]]))
    return torch.tensor(np.array(X), dtype=torch.float32)


def listing_features(listings):
    cont = torch.tensor(np.array([[(l["rent"] - 350) / 750, l["available_day"] / 90,
                                   l["min_lease"] / 12, l["housemates"] / 5] for l in listings]), dtype=torch.float32)
    area = torch.tensor([l["area"] for l in listings], dtype=torch.long)
    room = torch.tensor([l["room"] for l in listings], dtype=torch.long)
    return cont, area, room


# ---------------------------------------------------------------- 2. Model
class Tower(nn.Module):
    def __init__(self, n_cont, cat_cards=None, emb_dim=8, out_dim=64):
        super().__init__()
        cat_cards = cat_cards or {}
        self.emb = nn.ModuleDict({k: nn.Embedding(c, emb_dim) for k, c in cat_cards.items()})
        in_dim = n_cont + emb_dim * len(cat_cards)
        self.mlp = nn.Sequential(nn.Linear(in_dim, 128), nn.BatchNorm1d(128), nn.ReLU(),
                                 nn.Dropout(0.1), nn.Linear(128, out_dim))

    def forward(self, cont, cats=None):
        parts = [cont] + [self.emb[k](cats[k]) for k in self.emb]
        return F.normalize(self.mlp(torch.cat(parts, dim=-1)), dim=-1)


class HouseTwoTower(nn.Module):
    def __init__(self, n_tenant_cont):
        super().__init__()
        self.tenant_tower = Tower(n_tenant_cont)
        self.listing_tower = Tower(4, {"area": N_AREAS, "room": N_ROOMS})
        self.log_scale = nn.Parameter(torch.tensor(float(np.log(1 / 0.07))))

    def scale(self):
        return self.log_scale.exp().clamp(max=100)


def describe_tenant(t):
    return (f"areas={[AREAS[a] for a in t['areas']]} rooms={[ROOMS[r] for r in t['rooms']]} "
            f"budget={t['budget_min']}-{t['budget_max']} move_in=day {t['move_in_day']} "
            f"lease<={t['lease']}m max_housemates={t['max_housemates']}")


def describe_listing(l):
    return (f"{AREAS[l['area']]:<12} {ROOMS[l['room']]:<7} rent={l['rent']} avail=day {l['available_day']} "
            f"min_lease={l['min_lease']}m housemates={l['housemates']}")


# ---------------------------------------------------------------- 3. Train + evaluate
def main(epochs=100, batch_size=128, lr=1e-3):
    tenants, listings = generate_tenants(N_TENANTS), generate_listings(N_LISTINGS)
    compat = compat_matrix(tenants, listings)
    print(f"tenants: {N_TENANTS} | listings: {N_LISTINGS} | avg compatible listings per tenant: "
          f"{compat.sum(1).mean():.1f}")

    TX = tenant_features(tenants)
    LC, LA, LR = listing_features(listings)
    model = HouseTwoTower(TX.shape[1])
    opt = torch.optim.Adam(model.parameters(), lr=lr)

    tr_t = np.arange(N_TR_T)
    pos_lists = {t: np.where(compat[t, :N_TR_L])[0] for t in tr_t}
    tr_t = np.array([t for t in tr_t if len(pos_lists[t])])
    history = []

    for ep in range(epochs):
        model.train()
        pairs = np.array([(t, np.random.choice(pos_lists[t])) for t in tr_t])   # resample positives each epoch
        pairs = pairs[np.random.permutation(len(pairs))]
        losses = []
        for s in range(0, len(pairs), batch_size):
            b = pairs[s:s + batch_size]
            if len(b) < 8:
                continue
            ti, lj = torch.tensor(b[:, 0]), torch.tensor(b[:, 1])
            zt = model.tenant_tower(TX[ti])
            zl = model.listing_tower(LC[lj], {"area": LA[lj], "room": LR[lj]})
            sim = zt @ zl.T * model.scale()
            # mask in-batch "negatives" that are actually compatible (false negatives)
            eye = torch.eye(len(b), dtype=torch.bool)
            mask = torch.from_numpy(compat[b[:, 0][:, None], b[:, 1][None, :]]) & ~eye
            labels = torch.arange(len(b))
            loss = (F.cross_entropy(sim.masked_fill(mask, -1e9), labels) +
                    F.cross_entropy(sim.T.masked_fill(mask.T, -1e9), labels)) / 2
            opt.zero_grad(); loss.backward(); opt.step()
            losses.append(loss.item())
        history.append(float(np.mean(losses)))
        if ep % 10 == 0 or ep == epochs - 1:
            print(f"epoch {ep:02d}  loss {history[-1]:.4f}")

    # --- evaluation on held-out tenants x held-out listings
    model.eval()
    te_t, te_l = np.arange(N_TR_T, N_TENANTS), np.arange(N_TR_L, N_LISTINGS)
    with torch.no_grad():
        zt = model.tenant_tower(TX[te_t])
        zl = model.listing_tower(LC[te_l], {"area": LA[te_l], "room": LR[te_l]})
    sim = (zt @ zl.T).numpy()
    c = compat[np.ix_(te_t, te_l)]
    has_pos = c.any(1)
    top5 = np.argsort(-sim, axis=1)[:, :5]
    rand5 = np.argsort(-np.random.rand(*sim.shape), axis=1)[:, :5]
    hit = lambda top: np.mean([c[i, top[i]].any() for i in np.where(has_pos)[0]])
    prec = lambda top: np.mean([c[i, top[i]].mean() for i in np.where(has_pos)[0]])
    print(f"\nHeld-out tenants with >=1 compatible listing: {has_pos.sum()}")
    print(f"Hit@5  (>=1 compatible listing in top 5): model {hit(top5):.1%} vs random {hit(rand5):.1%}")
    print(f"Precision@5 (share of top 5 compatible):  model {prec(top5):.1%} vs random {prec(rand5):.1%}")

    # --- demo
    i = int(np.where(has_pos)[0][0])
    print("\nDemo - top 5 listings for held-out tenant")
    print("TENANT:", describe_tenant(tenants[te_t[i]]))
    for j in top5[i]:
        print(f"  {(sim[i, j] + 1) / 2 * 100:5.1f}%  rule-compatible={c[i, j]}  {describe_listing(listings[te_l[j]])}")

    plt.figure(figsize=(6, 3.5))
    plt.plot(history, marker="o", ms=3)
    plt.xlabel("epoch"); plt.ylabel("InfoNCE loss"); plt.title("House ranking two-tower loss")
    plt.grid(alpha=.3); plt.tight_layout(); plt.savefig("house_loss_curve.png", dpi=150)
    torch.save(model.state_dict(), "house_tower.pt")
    print("\nSaved house_loss_curve.png, house_tower.pt")


if __name__ == "__main__":
    main()
