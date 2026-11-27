import uvicorn
from fastapi import FastAPI
from openai import OpenAI

from src.utils.settings import Settings
from src.utils.vlmconfig import VlmClient


class SyncSpaceApp:
    def __init__(self, settings: Settings, client: VlmClient) -> None:
        self._settings = settings
        self._client = client
        self.api = FastAPI(title="SyncSpace VLM")
        self.api.add_api_route("/health", self.health, methods=["GET"])

    @classmethod
    def create(cls) -> "SyncSpaceApp":
        settings = Settings.from_env()
        openai_client = OpenAI(base_url=settings.lm_studio_base_url, api_key="lm-studio", max_retries=0)
        return cls(settings, VlmClient(openai_client, settings))

    def run(self) -> None:
        uvicorn.run(self.api, host=self._settings.api_host, port=self._settings.api_port)

    def health(self) -> dict:
        checks = {
            "lmstudio_reachable": self._client.is_reachable(),
            "model_loaded": self._client.is_model_loaded(),
        }
        status = "ok" if all(checks.values()) else "degraded"
        return {"status": status, "model_id": self._settings.lm_studio_model, **checks}


if __name__ == "__main__":
    SyncSpaceApp.create().run()
