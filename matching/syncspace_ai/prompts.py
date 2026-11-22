"""
Personality prompt bank. Same 10 prompts and ids as Dhruvil's spec (seed the `prompts`
table with these ids). Tenants pick 3 and answer each in <= 150 characters.

`profile_text()` turns a tenant's answers + bio into the one string the text encoder
embeds. The question is kept next to the answer so the encoder has context
("quiet" means something different under "Friday night" than under "studying").
"""
from __future__ import annotations

from .schema import TenantProfile

PROMPT_BANK: dict[int, str] = {
    1: "My ideal Friday night is…",
    2: "The one house rule I'd never break…",
    3: "You'll find me in the kitchen making…",
    4: "My biggest pet peeve in a shared house…",
    5: "On a lazy Sunday I'm usually…",
    6: "The best way to win me over is…",
    7: "I'm studying / working on…",
    8: "A small thing that makes my day…",
    9: "My go-to way to sort out a disagreement…",
    10: "Something I'm weirdly good at…",
}


def profile_text(tenant: TenantProfile) -> str:
    parts = []
    for pa in sorted(tenant.prompt_answers, key=lambda p: (p.slot or 99, p.prompt_id)):
        question = PROMPT_BANK.get(pa.prompt_id, "").rstrip("…")
        parts.append(f"{question} {pa.answer.strip()}".strip())
    if tenant.bio.strip():
        parts.append(tenant.bio.strip())
    return " ".join(parts)


def has_text(tenant: TenantProfile) -> bool:
    return bool(profile_text(tenant))
