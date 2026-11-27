# The 10 personality prompts (same ids as the prompts table).
# Tenants answer 3 of them, max 150 chars each.

PROMPT_BANK = {
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


def profile_text(tenant):
    # Join answers + bio into one string for the text model.
    # Keeping the question in helps, "quiet" means different things for different prompts.
    parts = []
    for pa in sorted(tenant.prompt_answers, key=lambda p: (p.slot or 99, p.prompt_id)):
        question = PROMPT_BANK.get(pa.prompt_id, "").rstrip("…")
        parts.append(f"{question} {pa.answer.strip()}".strip())
    if tenant.bio.strip():
        parts.append(tenant.bio.strip())
    return " ".join(parts)
