import httpx
import openai
from openai import OpenAI

from src.models.errors import VlmUnavailableError
from src.utils.settings import Settings


class VlmClient:
    def __init__(self, client: OpenAI, settings: Settings) -> None:
        self._client = client
        self._settings = settings

    def complete_json(self, messages: list[dict], schema_name: str, schema: dict) -> str:
        s = self._settings
        fmt = {"type": "json_schema", "json_schema": {"name": schema_name, "strict": True, "schema": schema}}
        try:
            res = self._client.chat.completions.create(
                model=s.lm_studio_model,
                messages=messages,
                temperature=s.vlm_temperature,
                seed=s.vlm_seed,
                max_tokens=s.vlm_max_tokens,
                timeout=s.lm_studio_timeout_s,
                response_format=fmt,
            )
        except openai.APIError as err:
            raise VlmUnavailableError(f"lm studio request failed: {err}") from err
        return res.choices[0].message.content or ""

    def is_reachable(self) -> bool:
        return self._model_ids() is not None

    def is_model_loaded(self) -> bool:
        # /v1/models lists every downloaded model, loaded or not, so ask lm studio's own api for the state
        url = self._settings.lm_studio_base_url.removesuffix("/v1") + "/api/v0/models"
        try:
            models = httpx.get(url, timeout=5).json()["data"]
        except (httpx.HTTPError, ValueError, KeyError):
            return False
        return any(m.get("id") == self._settings.lm_studio_model and m.get("state") == "loaded" for m in models)

    def _model_ids(self) -> list[str] | None:
        try:
            return [m.id for m in self._client.models.list().data]
        except openai.APIError:
            return None
