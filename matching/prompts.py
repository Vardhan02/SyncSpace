"""
SyncScape - Personality prompt bank (DRAFT for team approval).

Tenants pick 3 of these 10 prompts and answer them. The answers are shown on the
swipe card AND turned into one text string that the roommate two-tower model
embeds (all-MiniLM-L6-v2 -> 384-d).

Usage:
    from prompts import PROMPT_BANK, build_prompt_text
    text = build_prompt_text({2: "Out for a few pints, then home by 1am.",
                              5: "Whatever's in the fridge, usually pasta.",
                              9: "Cleaning up your own dishes."})
"""

PROMPT_BANK = {
    1: "A perfect weeknight at home looks like...",
    2: "On a Saturday night you'll usually find me...",
    3: "The thing that annoys me most in a shared house is...",
    4: "My ideal morning routine is...",
    5: "The meal I'd happily cook for the whole house is...",
    6: "I study or work best when...",
    7: "My friends would describe me as...",
    8: "A shared house should always have...",
    9: "My biggest roommate green flag is...",
    10: "The house rule I'd insist on is...",
}

NUM_REQUIRED = 3
MAX_ANSWER_CHARS = 200


def build_prompt_text(answers: dict) -> str:
    """answers: {prompt_id: answer_text}. Returns one string for the text encoder.

    Question + answer are both included so the encoder sees the context
    ("quiet" means something different under 'Saturday night' vs 'study').
    """
    if len(answers) != NUM_REQUIRED:
        raise ValueError(f"Exactly {NUM_REQUIRED} prompts must be answered, got {len(answers)}")
    parts = []
    for pid, ans in answers.items():
        if pid not in PROMPT_BANK:
            raise ValueError(f"Unknown prompt id: {pid}")
        ans = ans.strip()[:MAX_ANSWER_CHARS]
        if not ans:
            raise ValueError(f"Empty answer for prompt {pid}")
        parts.append(f"{PROMPT_BANK[pid]} {ans}")
    return " ".join(parts)


if __name__ == "__main__":
    demo = {2: "Out for a few pints, then home by 1am.",
            5: "Whatever's in the fridge, usually pasta.",
            9: "Cleaning up your own dishes."}
    print(build_prompt_text(demo))
