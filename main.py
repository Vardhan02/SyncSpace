from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from huggingface_hub import hf_hub_download
from openai import OpenAI

from src.utils.model_loader import ModelLoader
from src.utils.settings import Settings
from src.utils.vlmconfig import VlmClient


class SyncSpaceApp:
    def __init__(self, settings: Settings, client: VlmClient, loader: ModelLoader) -> None:
        self._settings = settings
        self._client = client
        self._loader = loader
        self.api = FastAPI(title="SyncSpace VLM", lifespan=self._lifespan)
        self.api.add_api_route("/health", self.health, methods=["GET"])

    @classmethod
    def create(cls) -> "SyncSpaceApp":
        settings = Settings.from_env()
        openai_client = OpenAI(base_url=settings.lm_studio_base_url, api_key="lm-studio", max_retries=0)
        client = VlmClient(openai_client, settings)
        return cls(settings, client, ModelLoader(settings, client, hf_hub_download))

    def run(self) -> None:
        uvicorn.run(self.api, host=self._settings.api_host, port=self._settings.api_port)

    def health(self) -> dict:
        checks = {
            "lmstudio_reachable": self._client.is_reachable(),
            "model_loaded": self._client.is_model_loaded(),
            "model_files_present": self._loader.files_present(),
        }
        status = "ok" if all(checks.values()) else "degraded"
        return {"status": status, "model_id": self._settings.lm_studio_model, **checks}

    @asynccontextmanager
    async def _lifespan(self, app: FastAPI):
        for line in self._loader.prepare():
            print(line)
        yield


if __name__ == "__main__":
    SyncSpaceApp.create().run()
