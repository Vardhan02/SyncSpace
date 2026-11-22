"""
Sentence encoder for prompt answers + bio (all-MiniLM-L6-v2, 384-d, runs on CPU).
Embeddings are cached in memory by text, so a tenant is only encoded once per process.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache

import numpy as np

MODEL_NAME = os.environ.get("SYNCSPACE_TEXT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
TEXT_DIM = 384
log = logging.getLogger(__name__)


class TextEncoder:
    def __init__(self, model_name: str = MODEL_NAME):
        from sentence_transformers import SentenceTransformer   # heavy import, keep lazy
        self.model = SentenceTransformer(model_name, device="cpu")
        self._cache: dict[str, np.ndarray] = {}

    def encode(self, texts: list[str]) -> np.ndarray:
        """(n, 384) unit vectors. Empty text gets a zero vector (= 'no information')."""
        missing = sorted({t for t in texts if t and t not in self._cache})
        if missing:
            vecs = self.model.encode(missing, batch_size=16, normalize_embeddings=True,
                                     show_progress_bar=False)
            self._cache.update(zip(missing, vecs.astype(np.float32)))
            if len(self._cache) > 50_000:       # simple bound on memory
                self._cache.clear()
        zero = np.zeros(TEXT_DIM, dtype=np.float32)
        return np.stack([self._cache.get(t, zero) if t else zero for t in texts]) if texts \
            else np.zeros((0, TEXT_DIM), dtype=np.float32)


class PrecomputedEncoder:
    """Serves embeddings computed earlier (see `python -m syncspace_ai.text`), so training
    and evaluation don't need to keep the language model in memory."""

    def __init__(self, texts: list[str], vectors: np.ndarray):
        self._cache = dict(zip(texts, vectors.astype(np.float32)))

    def encode(self, texts: list[str]) -> np.ndarray:
        zero = np.zeros(TEXT_DIM, dtype=np.float32)
        missing = [t for t in texts if t and t not in self._cache]
        if missing:
            raise KeyError(f"{len(missing)} texts were not precomputed, e.g. {missing[0][:60]!r}")
        return np.stack([self._cache[t] if t else zero for t in texts]) if texts \
            else np.zeros((0, TEXT_DIM), dtype=np.float32)


def precompute(tenants_jsonl: str, out_npz: str) -> None:
    """Embed profile_text() of every tenant in a JSONL file -> .npz with texts + vectors."""
    from .prompts import profile_text
    from .schema import TenantProfile
    with open(tenants_jsonl, encoding="utf-8") as f:
        texts = sorted({profile_text(TenantProfile.model_validate_json(line)) for line in f if line.strip()})
    vecs = TextEncoder().encode(texts)
    np.savez(out_npz, texts=np.array(texts, dtype=object), vectors=vecs)


def load_precomputed(path) -> PrecomputedEncoder:
    d = np.load(path, allow_pickle=True)
    return PrecomputedEncoder(list(d["texts"]), d["vectors"])


@lru_cache(maxsize=1)
def get_encoder() -> TextEncoder | None:
    """The shared encoder, or None if sentence-transformers / the model can't be loaded."""
    try:
        return TextEncoder()
    except Exception as e:  # noqa: BLE001 - any failure means "run without text"
        log.warning("Text encoder unavailable (%s); falling back to rules only.", e)
        return None


if __name__ == "__main__":
    import sys
    precompute(sys.argv[1], sys.argv[2])
