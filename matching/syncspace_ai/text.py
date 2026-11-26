# Sentence embeddings for prompt answers + bio (all-MiniLM-L6-v2, 384 dims, CPU)

import logging
import os
from functools import lru_cache

import numpy as np

MODEL_NAME = os.environ.get("SYNCSPACE_TEXT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
TEXT_DIM = 384
log = logging.getLogger(__name__)


def stack(texts, lookup):
    # empty text -> zero vector
    if not texts:
        return np.zeros((0, TEXT_DIM), dtype=np.float32)
    zero = np.zeros(TEXT_DIM, dtype=np.float32)
    return np.stack([lookup(t) if t else zero for t in texts])


class TextEncoder:
    def __init__(self, model_name=MODEL_NAME):
        # import here because it's slow
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name, device="cpu")
        self.cache = {}

    def encode(self, texts):
        missing = sorted({t for t in texts if t and t not in self.cache})
        if missing:
            vecs = self.model.encode(missing, batch_size=16, normalize_embeddings=True,
                                     show_progress_bar=False)
            self.cache.update(zip(missing, vecs.astype(np.float32)))
            if len(self.cache) > 50_000:
                self.cache.clear()
        zero = np.zeros(TEXT_DIM, dtype=np.float32)
        return stack(texts, lambda t: self.cache.get(t, zero))


class PrecomputedEncoder:
    # embeddings saved earlier, so training doesn't need the language model loaded
    def __init__(self, texts, vectors):
        self.cache = dict(zip(texts, vectors.astype(np.float32)))

    def encode(self, texts):
        missing = [t for t in texts if t and t not in self.cache]
        if missing:
            raise KeyError(f"{len(missing)} texts were not precomputed, e.g. {missing[0][:60]!r}")
        return stack(texts, lambda t: self.cache[t])


def precompute(tenants_jsonl, out_npz):
    from .prompts import profile_text
    from .schema import TenantProfile
    with open(tenants_jsonl, encoding="utf-8") as f:
        texts = sorted({profile_text(TenantProfile.model_validate_json(line)) for line in f if line.strip()})
    vecs = TextEncoder().encode(texts)
    np.savez(out_npz, texts=np.array(texts, dtype=object), vectors=vecs)


def load_precomputed(path):
    d = np.load(path, allow_pickle=True)
    return PrecomputedEncoder(list(d["texts"]), d["vectors"])


@lru_cache(maxsize=1)
def get_encoder():
    # returns None if the model can't load, then we just run without text
    try:
        return TextEncoder()
    except Exception as e:
        log.warning("Text encoder not available (%s), using rules only", e)
        return None


if __name__ == "__main__":
    # python -m syncspace_ai.text data/tenants.jsonl data/text_emb.npz
    import sys
    precompute(sys.argv[1], sys.argv[2])
