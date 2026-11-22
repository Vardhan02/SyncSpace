"""
The final ranking pipeline, shared by the API and the evaluation script.

    1. hard filters   -> dealbreakers are removed (never shown)
    2. signals        -> rule score, two-tower cosine, prompt-text cosine (roommates only)
    3. calibration    -> logistic regression (fitted on validation data) turns the signals
                         into one 0-1 score: the estimated chance it's a good match
    4. explanations   -> reasons / cautions for the top results

If the model files or the text encoder are missing, it falls back to the rule score alone
(mode = "rules"), so the app keeps working.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Optional

import numpy as np
import torch

from . import models as M
from .arrays import house_arrays, tenant_arrays
from .features import house_features, tenant_features
from .prompts import profile_text
from .rules import (HOUSE_FILTERS, ROOMMATE_FILTERS, house_components, house_explain,
                    house_hard_filter, house_rule_score, roommate_components,
                    roommate_explain, roommate_hard_filter, roommate_rule_score)
from .schema import (FilteredItem, House, RankedItem, RankResponse, TenantProfile)
from .text import TEXT_DIM, get_encoder

log = logging.getLogger(__name__)
ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ROOMMATE_SIGNALS = ["rule", "model", "text"]
HOUSE_SIGNALS = ["rule", "model"]


@dataclass
class Scores:
    """Everything computed for an (n queries x m candidates) block."""
    hard: np.ndarray                      # int codes, 0 = passes
    signals: dict[str, np.ndarray]        # each (n, m)
    final: np.ndarray                     # (n, m) in 0-1
    comps: dict[str, np.ndarray] = field(default_factory=dict)


class Recommender:
    def __init__(self, artifact_dir: Path | str = ARTIFACT_DIR, use_models: bool = True,
                 encoder="auto"):
        self.artifact_dir = Path(artifact_dir)
        self.roommate_model = self.house_model = None
        self.calibration: dict = {}
        if use_models:
            self._load()
        if encoder == "auto":
            encoder = get_encoder() if self.models_loaded else None
        self.encoder = encoder

    # ------------------------------------------------------------ loading / status
    def _load(self):
        try:
            self.roommate_model = M.load(M.RoommateModel, self.artifact_dir / "roommate_model.pt")
            self.house_model = M.load(M.HouseModel, self.artifact_dir / "house_model.pt")
            self.calibration = json.loads((self.artifact_dir / "calibration.json").read_text())
        except Exception as e:  # noqa: BLE001 - missing/corrupt artifacts -> rules mode
            log.warning("Model artifacts not loaded from %s (%s); using rules only.", self.artifact_dir, e)
            self.roommate_model = self.house_model = None
            self.calibration = {}

    @property
    def models_loaded(self) -> bool:
        return self.roommate_model is not None and self.house_model is not None and bool(self.calibration)

    @property
    def mode(self) -> str:
        return "hybrid" if self.models_loaded and self.encoder is not None else "rules"

    def status(self) -> dict:
        return {"mode": self.mode, "models_loaded": self.models_loaded,
                "text_encoder_loaded": self.encoder is not None,
                "trained_at": self.calibration.get("trained_at")}

    # ------------------------------------------------------------ helpers
    def encode_text(self, tenants: list[TenantProfile]) -> np.ndarray:
        if self.encoder is None:
            return np.zeros((len(tenants), TEXT_DIM), dtype=np.float32)
        return self.encoder.encode([profile_text(t) for t in tenants])

    def blend_logit(self, kind: str, signals: dict[str, np.ndarray]) -> np.ndarray:
        """Calibrated log-odds that the pair is a good match (hybrid mode only)."""
        cal = self.calibration[kind]
        return cal["intercept"] + sum(w * signals[n] for n, w in zip(cal["features"], cal["coef"]))

    def _blend(self, kind: str, signals: dict[str, np.ndarray], rule: np.ndarray) -> np.ndarray:
        """Final 0-1 score = percentile of the blended signal among validation pairs that
        pass the dealbreakers (0.9 = better than 90% of them). Ordering is the same as the
        calibrated probability; the percentile just reads better as a '% match'."""
        if self.mode == "hybrid":
            value, key = self.blend_logit(kind, signals), "logit_quantiles"
        else:
            value, key = rule, "rule_quantiles"
        q = self.calibration.get(kind, {}).get(key)
        if not q:
            return rule                       # no calibration file at all: raw rule score
        return np.interp(value, q, np.linspace(0, 1, len(q)))

    # ------------------------------------------------------------ matrix scoring
    def roommate_matrix(self, A: list[TenantProfile], B: list[TenantProfile], today: date,
                        text_a: Optional[np.ndarray] = None, text_b: Optional[np.ndarray] = None) -> Scores:
        TA, TB = tenant_arrays(A), tenant_arrays(B)
        hard = roommate_hard_filter(TA, TB)
        comps = roommate_components(TA, TB)
        rule = roommate_rule_score(TA, TB, comps)
        signals = {"rule": rule}
        if self.mode == "hybrid":
            text_a = self.encode_text(A) if text_a is None else text_a
            text_b = self.encode_text(B) if text_b is None else text_b
            with torch.no_grad():
                ea = self.roommate_model.embed(torch.from_numpy(tenant_features(TA, text_a, today.toordinal())))
                eb = self.roommate_model.embed(torch.from_numpy(tenant_features(TB, text_b, today.toordinal())))
            signals["model"] = (ea @ eb.T).numpy()
            signals["text"] = text_a @ text_b.T
        return Scores(hard, signals, self._blend("roommate", signals, rule), comps)

    def house_matrix(self, tenants: list[TenantProfile], houses: list[House], today: date,
                     text: Optional[np.ndarray] = None) -> Scores:
        T, H = tenant_arrays(tenants), house_arrays(houses)
        hard = house_hard_filter(T, H)
        comps = house_components(T, H)
        rule = house_rule_score(T, H, comps)
        signals = {"rule": rule}
        if self.mode == "hybrid":
            text = self.encode_text(tenants) if text is None else text
            with torch.no_grad():
                et = self.house_model.tenant_tower(torch.from_numpy(tenant_features(T, text, today.toordinal())))
                eh = self.house_model.house_tower(torch.from_numpy(house_features(H, today.toordinal())))
            signals["model"] = (et @ eh.T).numpy()
        return Scores(hard, signals, self._blend("house", signals, rule), comps)

    # ------------------------------------------------------------ API entry points
    def rank_roommates(self, tenant: TenantProfile, candidates: list[TenantProfile],
                       limit: Optional[int] = None, today: Optional[date] = None) -> RankResponse:
        today = today or date.today()
        candidates = [c for c in candidates if c.tenant_id != tenant.tenant_id]
        if not candidates:
            return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode, results=[], filtered_out=[])
        s = self.roommate_matrix([tenant], candidates, today)
        return self._response(tenant, candidates, s, limit, ROOMMATE_FILTERS,
                              lambda c, comps: roommate_explain(tenant, c, comps), "tenant_id")

    def rank_houses(self, tenant: TenantProfile, houses: list[House],
                    limit: Optional[int] = None, today: Optional[date] = None) -> RankResponse:
        today = today or date.today()
        if not houses:
            return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode, results=[], filtered_out=[])
        s = self.house_matrix([tenant], houses, today)
        return self._response(tenant, houses, s, limit, HOUSE_FILTERS,
                              lambda h, comps: house_explain(tenant, h, comps), "house_id")

    def _response(self, tenant, items, s: Scores, limit, filter_names, explain, id_attr) -> RankResponse:
        hard, final = s.hard[0], s.final[0]
        keep = np.where(hard == 0)[0]
        order = keep[np.argsort(-final[keep], kind="stable")]
        if limit:
            order = order[:limit]
        results = []
        for j in order:
            comps = {k: float(v[0, j]) for k, v in s.comps.items()}
            reasons, cautions = explain(items[j], comps)
            results.append(RankedItem(id=getattr(items[j], id_attr),
                                      score=int(round(float(final[j]) * 100)),
                                      reasons=reasons, cautions=cautions))
        filtered = [FilteredItem(id=getattr(items[j], id_attr), reason=filter_names[hard[j]])
                    for j in np.where(hard != 0)[0]]
        return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode,
                            results=results, filtered_out=filtered)
