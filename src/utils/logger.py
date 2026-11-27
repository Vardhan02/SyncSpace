import json
import os
import threading
from pathlib import Path

from src.models.schemas import AgentName, Job


class JobLogger:
    # logs/<house_id>.json -> {"house_id": ..., "amenities_verify": {"runs": [...]}, "desc_audit": {"runs": [...]}}
    def __init__(self, logs_dir: Path) -> None:
        self._dir = Path(logs_dir)
        self._lock = threading.Lock()

    def save(self, job: Job) -> None:
        with self._lock:
            path = self._path(job.house_id)
            doc = self._read(path, job.house_id)
            self._upsert(doc[job.agent.value]["runs"], job.model_dump(mode="json"))
            self._write(path, doc)

    def find(self, job_id: str) -> dict | None:
        with self._lock:
            for path in sorted(self._dir.glob("*.json")):
                run = self._find_in(self._load(path), job_id)
                if run:
                    return run
        return None

    def latest(self, house_id: int) -> dict[str, dict] | None:
        # newest run of each agent for this house; runs are appended so the last one is the newest
        with self._lock:
            doc = self._load(self._path(house_id))
        runs = {a.value: doc.get(a.value, {}).get("runs", []) for a in AgentName}
        if not all(runs.values()):
            return None
        return {agent: r[-1] for agent, r in runs.items()}

    def _find_in(self, document: dict, job_id: str) -> dict | None:
        for agent in AgentName:
            for run in document.get(agent.value, {}).get("runs", []):
                if run.get("job_id") == job_id:
                    return run
        return None

    def _upsert(self, runs: list[dict], record: dict) -> None:
        for i, run in enumerate(runs):
            if run["job_id"] == record["job_id"]:
                runs[i] = record
                return
        runs.append(record)

    def _read(self, path: Path, house_id: int) -> dict:
        document = self._load(path)
        document["house_id"] = house_id
        for agent in AgentName:
            document.setdefault(agent.value, {"runs": []}).setdefault("runs", [])
        return document

    def _load(self, path: Path) -> dict:
        try:
            data = json.loads(path.read_text())
        except (OSError, ValueError):
            return {}
        return data if isinstance(data, dict) else {}

    def _write(self, path: Path, document: dict) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)
        # write to a temp file first so a poll never reads half a file
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(document, indent=2))
        os.replace(tmp, path)

    def _path(self, house_id: int) -> Path:
        return self._dir / f"{house_id}.json"
