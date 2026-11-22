"""
Two-tower networks.

- RoommateModel: Siamese (one shared tower) because both sides are tenants.
- HouseModel:    asymmetric (tenant tower + house tower) because the sides differ.

Each tower maps its features to a unit vector; the match signal is the cosine similarity.
Trained with in-batch InfoNCE (see train_*.py).
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class Tower(nn.Module):
    def __init__(self, in_dim: int, hidden: int = 256, out_dim: int = 64, dropout: float = 0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.LayerNorm(hidden), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden, hidden // 2), nn.ReLU(),
            nn.Linear(hidden // 2, out_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return F.normalize(self.net(x), dim=-1)


class _Scaled(nn.Module):
    def __init__(self):
        super().__init__()
        self.log_scale = nn.Parameter(torch.tensor(2.66))    # ln(1/0.07), learnable temperature

    def scale(self) -> torch.Tensor:
        return self.log_scale.exp().clamp(max=100)


class RoommateModel(_Scaled):
    def __init__(self, tenant_dim: int, out_dim: int = 64):
        super().__init__()
        self.config = {"tenant_dim": tenant_dim, "out_dim": out_dim}
        self.tower = Tower(tenant_dim, out_dim=out_dim)

    def embed(self, x: torch.Tensor) -> torch.Tensor:
        return self.tower(x)


class HouseModel(_Scaled):
    def __init__(self, tenant_dim: int, house_dim: int, out_dim: int = 64):
        super().__init__()
        self.config = {"tenant_dim": tenant_dim, "house_dim": house_dim, "out_dim": out_dim}
        self.tenant_tower = Tower(tenant_dim, out_dim=out_dim)
        self.house_tower = Tower(house_dim, hidden=128, out_dim=out_dim)


def info_nce(sim: torch.Tensor, false_neg: torch.Tensor | None = None) -> torch.Tensor:
    """Symmetric in-batch InfoNCE. `false_neg` marks off-diagonal pairs that are actually
    compatible, so they aren't pushed apart as negatives."""
    labels = torch.arange(sim.size(0))
    if false_neg is not None:
        sim = sim.masked_fill(false_neg, -1e4)
    return (F.cross_entropy(sim, labels) + F.cross_entropy(sim.T, labels)) / 2


def save(model: nn.Module, path) -> None:
    torch.save({"config": model.config, "state_dict": model.state_dict()}, path)


def load(cls, path):
    ckpt = torch.load(path, map_location="cpu", weights_only=True)
    model = cls(**ckpt["config"])
    model.load_state_dict(ckpt["state_dict"])
    return model.eval()
