# two-tower models. roommates share one tower (both sides are tenants),
# houses have a tenant tower and a house tower. score = cosine similarity

import torch
import torch.nn as nn
import torch.nn.functional as F


class Tower(nn.Module):
    def __init__(self, in_dim, hidden=256, out_dim=64, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.LayerNorm(hidden), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden, hidden // 2), nn.ReLU(),
            nn.Linear(hidden // 2, out_dim),
        )

    def forward(self, x):
        return F.normalize(self.net(x), dim=-1)


class TwoTowerBase(nn.Module):
    def __init__(self):
        super().__init__()
        # learnable temperature, starts at 1/0.07
        self.log_scale = nn.Parameter(torch.tensor(2.66))

    def scale(self):
        return self.log_scale.exp().clamp(max=100)


class RoommateModel(TwoTowerBase):
    def __init__(self, tenant_dim, out_dim=64):
        super().__init__()
        self.config = {"tenant_dim": tenant_dim, "out_dim": out_dim}
        self.tower = Tower(tenant_dim, out_dim=out_dim)

    def embed(self, x):
        return self.tower(x)


class HouseModel(TwoTowerBase):
    def __init__(self, tenant_dim, house_dim, out_dim=64):
        super().__init__()
        self.config = {"tenant_dim": tenant_dim, "house_dim": house_dim, "out_dim": out_dim}
        self.tenant_tower = Tower(tenant_dim, out_dim=out_dim)
        self.house_tower = Tower(house_dim, hidden=128, out_dim=out_dim)


def info_nce(sim, false_neg=None):
    # in-batch InfoNCE both ways. false_neg = other pairs in the batch that are actually
    # good matches, so we don't push them apart
    labels = torch.arange(sim.size(0))
    if false_neg is not None:
        sim = sim.masked_fill(false_neg, -1e4)
    return (F.cross_entropy(sim, labels) + F.cross_entropy(sim.T, labels)) / 2


def save(model, path):
    torch.save({"config": model.config, "state_dict": model.state_dict()}, path)


def load(cls, path):
    ckpt = torch.load(path, map_location="cpu", weights_only=True)
    model = cls(**ckpt["config"])
    model.load_state_dict(ckpt["state_dict"])
    return model.eval()
