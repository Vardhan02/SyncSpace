from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import JSONResponse
from huggingface_hub import hf_hub_download

from src.models.schemas import AgentName, Job, VerifyRequest
from src.utils.job_tracker import JobTracker
from src.utils.logger import JobLogger
from src.utils.model_loader import ModelLoader
from src.utils.settings import Settings
from src.utils.vlmconfig import VlmConfig

# fields returned by GET /jobs/{id} depending on where the job is
POLL_FIELDS = {
    "PENDING": ["submitted_at"],
    "RUNNING": ["started_at", "current_step", "steps"],
    "COMPLETED": ["started_at", "ended_at", "duration_s", "result"],
    "FAILED": ["started_at", "ended_at", "duration_s", "error"],
}


class SyncSpaceApp:
    def __init__(self, settings: Settings, config: VlmConfig, tracker: JobTracker,
                 logger: JobLogger, loader: ModelLoader) -> None:
        self._settings = settings
        self._config = config
        self._tracker = tracker
        self._logger = logger
        self._loader = loader

        self.api = FastAPI(title="SyncSpace VLM", lifespan=self._lifespan)
        self.api.add_api_route("/health", self.health, methods=["GET"])
        self.api.add_api_route("/listings/verify", self.verify, methods=["POST"], status_code=202)
        self.api.add_api_route("/jobs/{job_id}", self.get_job, methods=["GET"])

    @classmethod
    def create(cls) -> "SyncSpaceApp":
        settings = Settings.from_env()
        tracker = JobTracker()
        logger = JobLogger(Path(settings.logs_dir))
        config = VlmConfig.create(settings, tracker, logger)
        loader = ModelLoader(settings, config.client, hf_hub_download)
        return cls(settings, config, tracker, logger, loader)

    def run(self) -> None:
        uvicorn.run(self.api, host=self._settings.api_host, port=self._settings.api_port)

    def health(self) -> dict:
        client = self._config.client
        checks = {
            "lmstudio_reachable": client.is_reachable(),
            "model_loaded": client.is_model_loaded(),
            "model_files_present": self._loader.files_present(),
        }
        status = "ok" if all(checks.values()) else "degraded"
        return {"status": status, "model_id": self._settings.lm_studio_model, **checks}

    def verify(self, body: VerifyRequest, background: BackgroundTasks) -> JSONResponse:
        # one job per agent, both queued behind the same lock
        jobs = {}
        for agent in [AgentName.AMENITIES_VERIFY, AgentName.DESC_AUDIT]:
            job = self._submit(agent, body, background)
            jobs[agent.value] = {"job_id": job.job_id, "status": job.status}
        return JSONResponse({
            "house_id": body.house_id,
            "jobs": jobs,
            "status_code": 202,
            "meaning": self._tracker.meaning("PENDING", 202),
        }, status_code=202)

    def get_job(self, job_id: str) -> JSONResponse:
        run = self._logger.find(job_id)
        if run is None:
            err = {"code": "JOB_NOT_FOUND", "message": f"no job with id '{job_id}'"}
            return JSONResponse({"error": err}, 404)
        return JSONResponse(self._poll_body(run), status_code=run["status_code"])

    def _submit(self, agent: AgentName, body: VerifyRequest, background: BackgroundTasks) -> Job:
        job = self._tracker.create(agent, body.house_id, body.landlord_id)
        self._logger.save(job)
        background.add_task(self._config.run, job, body)
        return job

    def _poll_body(self, run: dict) -> dict:
        body = {k: run.get(k) for k in ["job_id", "agent", "house_id", "status", "status_code"]}
        body["meaning"] = self._tracker.meaning(run["status"], run["status_code"])
        for k in POLL_FIELDS.get(run["status"], []):
            body[k] = run.get(k)
        return body

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        for line in self._loader.prepare():
            print(line)
        yield


if __name__ == "__main__":
    SyncSpaceApp.create().run()
