import uvicorn
from fastapi import FastAPI

from src.utils.settings import Settings


class SyncSpaceApp:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self.api = FastAPI(title="SyncSpace VLM")
        self.api.add_api_route("/health", self.health, methods=["GET"])

    @classmethod
    def create(cls) -> "SyncSpaceApp":
        return cls(Settings.from_env())

    def run(self) -> None:
        uvicorn.run(self.api, host=self._settings.api_host, port=self._settings.api_port)

    def health(self) -> dict:
        # TODO: check lm studio here too
        return {"status": "ok", "model_id": self._settings.lm_studio_model}


if __name__ == "__main__":
    SyncSpaceApp.create().run()
