import uuid
from collections.abc import Callable
from datetime import datetime, timezone

from src.models.schemas import AgentName, Job, JobError


class JobTracker:
    _MEANINGS = {
        "PENDING": "Accepted: the job is queued. Poll for progress.",
        "RUNNING": "Accepted: the job is running. Poll again.",
        "COMPLETED": "OK: the job finished; the result is included.",
        422: "Unprocessable: the request has no usable photos or the description is invalid.",
        500: "Server error: an unexpected error stopped the job.",
        502: "Bad gateway: the model returned output that did not match the schema.",
        503: "Service unavailable: LM Studio is down or the model is not loaded.",
    }

    def __init__(self, clock: Callable[[], datetime] | None = None) -> None:
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def create(self, agent: AgentName, house_id: int, landlord_id: str) -> Job:
        return Job(house_id=house_id, landlord_id=landlord_id, job_id=str(uuid.uuid4()),
                   agent=agent, submitted_at=self._now())

    def start(self, job: Job) -> None:
        job.status = "RUNNING"
        job.status_code = 202
        job.started_at = self._now()

    def step_started(self, job: Job, step: str) -> None:
        job.current_step = step
        job.steps[step] = {"started_at": self._now(), "ended_at": None}

    def step_finished(self, job: Job, step: str) -> None:
        job.steps[step]["ended_at"] = self._now()

    def complete(self, job: Job, result: dict) -> None:
        job.status = "COMPLETED"
        job.status_code = 200
        job.result = result
        job.current_step = None
        self._close(job)

    def fail(self, job: Job, code: str, message: str, status_code: int) -> None:
        job.status = "FAILED"
        job.status_code = status_code
        job.current_step = None
        job.error = JobError(code=code, message=message)
        self._close(job)

    def meaning(self, job_status: str, status_code: int) -> str:
        # running/done states have their own text, failures go by http code
        if job_status in self._MEANINGS:
            return self._MEANINGS[job_status]
        return self._MEANINGS.get(status_code, "Unknown status.")

    def _close(self, job: Job) -> None:
        job.ended_at = self._now()
        if job.started_at:
            job.duration_s = round((self._parse(job.ended_at) - self._parse(job.started_at)).total_seconds(), 3)

    def _now(self) -> str:
        return self._clock().isoformat(timespec="milliseconds").replace("+00:00", "Z")

    def _parse(self, stamp: str) -> datetime:
        return datetime.fromisoformat(stamp.replace("Z", "+00:00"))
