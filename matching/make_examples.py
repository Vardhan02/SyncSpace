"""Write small example request bodies to examples/ (used by API.md and the tests)."""
import json
from pathlib import Path

from syncspace_ai.arrays import house_arrays, tenant_arrays
from syncspace_ai.rules import house_hard_filter, roommate_hard_filter
from syncspace_ai.synth import generate_houses, generate_tenants
from train import TODAY

OUT = Path(__file__).resolve().parent / "examples"


def main():
    tenants, _ = generate_tenants(40, TODAY, seed=7, id_prefix="tenant-")
    houses = generate_houses(80, TODAY, seed=8, id_prefix="house-")
    # Use the tenant with the most houses passing the dealbreakers, so the example shows
    # real results; then keep a mix of passing and filtered houses/candidates.
    T, H = tenant_arrays(tenants), house_arrays(houses)
    hpass = house_hard_filter(T, H) == 0
    i = int(hpass.sum(1).argmax())
    me = tenants[i]
    others = [t for t in tenants if t is not me]
    rpass = roommate_hard_filter(tenant_arrays([me]), tenant_arrays(others))[0] == 0
    candidates = [t for t, ok in zip(others, rpass) if ok][:7] + [t for t, ok in zip(others, rpass) if not ok][:3]
    house_list = [h for h, ok in zip(houses, hpass[i]) if ok][:8] + [h for h, ok in zip(houses, hpass[i]) if not ok][:4]
    dump = lambda m: json.loads(m.model_dump_json())
    OUT.mkdir(exist_ok=True)
    (OUT / "rank_roommates.json").write_text(json.dumps(
        {"tenant": dump(me), "candidates": [dump(t) for t in candidates], "limit": 20,
         "today": TODAY.isoformat()}, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "rank_houses.json").write_text(json.dumps(
        {"tenant": dump(me), "houses": [dump(h) for h in house_list], "limit": 20,
         "today": TODAY.isoformat()}, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", *sorted(p.name for p in OUT.glob("*.json")))


if __name__ == "__main__":
    main()
