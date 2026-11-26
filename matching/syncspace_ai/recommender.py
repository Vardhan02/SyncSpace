# ranking used by the api and evaluate.py
# filters -> rule score + two-tower + text similarity -> logistic regression blend -> reasons
# if the model files aren't there it falls back to just the rule score

import json
import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import numpy as np
import torch

from . import models as M
from .arrays import house_arrays, tenant_arrays
from .features import house_features, tenant_features
from .prompts import profile_text
from .rules import (HOUSE_FILTERS, ROOMMATE_FILTERS, house_components, house_explain,
                    house_hard_filter, house_rule_score, roommate_components,
                    roommate_explain, roommate_hard_filter, roommate_rule_score)
from .schema import FilteredItem, RankedItem, RankResponse
from .text import TEXT_DIM, get_encoder

log = logging.getLogger(__name__)
ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ROOMMATE_SIGNALS = ["rule", "model", "text"]
HOUSE_SIGNALS = ["rule", "model"]


@dataclass
class Scores:
    hard: np.ndarray      # 0 = passes, otherwise filter code
    signals: dict
    final: np.ndarray     # 0-1
    comps: dict = field(default_factory=dict)


class Recommender:
    def __init__(self, artifact_dir=ARTIFACT_DIR, use_models=True, encoder="auto"):
        self.artifact_dir = Path(artifact_dir)
        self.roommate_model = None
        self.house_model = None
        self.calibration = {}
        if use_models:
            self.load()
        if encoder == "auto":
            encoder = get_encoder() if self.models_loaded else None
        self.encoder = encoder

    def load(self):
        try:
            self.roommate_model = M.load(M.RoommateModel, self.artifact_dir / "roommate_model.pt")
            self.house_model = M.load(M.HouseModel, self.artifact_dir / "house_model.pt")
            self.calibration = json.loads((self.artifact_dir / "calibration.json").read_text())
        except Exception as e:
            # missing or broken files -> fall back to rules
            log.warning("Could not load models from %s (%s), using rules only", self.artifact_dir, e)
            self.roommate_model = None
            self.house_model = None
            self.calibration = {}

    @property
    def models_loaded(self):
        return self.roommate_model is not None and self.house_model is not None and bool(self.calibration)

    @property
    def mode(self):
        if self.models_loaded and self.encoder is not None:
            return "hybrid"
        return "rules"

    def status(self):
        return {
            "mode": self.mode,
            "models_loaded": self.models_loaded,
            "text_encoder_loaded": self.encoder is not None,
            "trained_at": self.calibration.get("trained_at"),
        }

    def encode_text(self, tenants):
        if self.encoder is None:
            return np.zeros((len(tenants), TEXT_DIM), dtype=np.float32)
        return self.encoder.encode([profile_text(t) for t in tenants])

    def blend_logit(self, kind, signals):
        cal = self.calibration[kind]
        return cal["intercept"] + sum(w * signals[n] for n, w in zip(cal["features"], cal["coef"]))

    def blend(self, kind, signals, rule):
        # Turn the blended value into a percentile among val pairs (0.9 = better than 90%).
        # Same order as the probability, just reads better as a "% match".
        if self.mode == "hybrid":
            value = self.blend_logit(kind, signals)
            q = self.calibration.get(kind, {}).get("logit_quantiles")
        else:
            value = rule
            q = self.calibration.get(kind, {}).get("rule_quantiles")
        if not q:
            return rule
        return np.interp(value, q, np.linspace(0, 1, len(q)))

    def roommate_matrix(self, A, B, today, text_a=None, text_b=None):
        TA, TB = tenant_arrays(A), tenant_arrays(B)
        hard = roommate_hard_filter(TA, TB)
        comps = roommate_components(TA, TB)
        rule = roommate_rule_score(TA, TB, comps)
        signals = {"rule": rule}
        if self.mode == "hybrid":
            if text_a is None:
                text_a = self.encode_text(A)
            if text_b is None:
                text_b = self.encode_text(B)
            day = today.toordinal()
            with torch.no_grad():
                ea = self.roommate_model.embed(torch.from_numpy(tenant_features(TA, text_a, day)))
                eb = self.roommate_model.embed(torch.from_numpy(tenant_features(TB, text_b, day)))
            signals["model"] = (ea @ eb.T).numpy()
            signals["text"] = text_a @ text_b.T
        return Scores(hard, signals, self.blend("roommate", signals, rule), comps)

    def house_matrix(self, tenants, houses, today, text=None):
        T, H = tenant_arrays(tenants), house_arrays(houses)
        hard = house_hard_filter(T, H)
        comps = house_components(T, H)
        rule = house_rule_score(T, H, comps)
        signals = {"rule": rule}
        if self.mode == "hybrid":
            if text is None:
                text = self.encode_text(tenants)
            day = today.toordinal()
            with torch.no_grad():
                et = self.house_model.tenant_tower(torch.from_numpy(tenant_features(T, text, day)))
                eh = self.house_model.house_tower(torch.from_numpy(house_features(H, day)))
            signals["model"] = (et @ eh.T).numpy()
        return Scores(hard, signals, self.blend("house", signals, rule), comps)

    def rank_roommates(self, tenant, candidates, limit=None, today=None):
        today = today or date.today()
        candidates = [c for c in candidates if c.tenant_id != tenant.tenant_id]
        if not candidates:
            return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode, results=[], filtered_out=[])
        s = self.roommate_matrix([tenant], candidates, today)
        ids = [c.tenant_id for c in candidates]
        explain = lambda j, comps: roommate_explain(tenant, candidates[j], comps)
        return self.make_response(tenant, ids, s, limit, ROOMMATE_FILTERS, explain)

    def rank_houses(self, tenant, houses, limit=None, today=None):
        today = today or date.today()
        if not houses:
            return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode, results=[], filtered_out=[])
        s = self.house_matrix([tenant], houses, today)
        ids = [h.house_id for h in houses]
        explain = lambda j, comps: house_explain(tenant, houses[j], comps)
        return self.make_response(tenant, ids, s, limit, HOUSE_FILTERS, explain)

    def make_response(self, tenant, ids, s, limit, filter_names, explain):
        hard, final = s.hard[0], s.final[0]
        keep = np.where(hard == 0)[0]
        order = keep[np.argsort(-final[keep], kind="stable")]
        if limit:
            order = order[:limit]

        results = []
        for j in order:
            comps = {k: float(v[0, j]) for k, v in s.comps.items()}
            reasons, cautions = explain(j, comps)
            score = int(round(float(final[j]) * 100))
            results.append(RankedItem(id=ids[j], score=score, reasons=reasons, cautions=cautions))

        filtered = []
        for j in np.where(hard != 0)[0]:
            filtered.append(FilteredItem(id=ids[j], reason=filter_names[hard[j]]))

        return RankResponse(tenant_id=tenant.tenant_id, mode=self.mode, results=results, filtered_out=filtered)
