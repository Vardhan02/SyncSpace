import base64
import io
import re
import threading
import traceback
from pathlib import Path
from typing import Any, TypedDict, TypeVar

import httpx
import openai
import yaml
from langgraph.graph import END, START, StateGraph
from openai import OpenAI
from PIL import Image, ImageOps
from pydantic import BaseModel, ValidationError

from src.models.errors import InvalidListingError, PipelineError, VlmOutputError, VlmUnavailableError
from src.models.schemas import Job, Listing, PhotoIn, PreparedImage, SkippedPhoto, VerifyRequest
from src.utils.job_tracker import JobTracker
from src.utils.logger import JobLogger
from src.utils.settings import Settings

ModelT = TypeVar("ModelT", bound=BaseModel)


class VlmState(TypedDict, total=False):
    job: Job
    request: VerifyRequest
    listing: Listing
    result: dict


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


class VlmCaller:
    _CORRECTION = "Your previous reply was not valid JSON for the required schema. Reply again with only the JSON object."
    # some models still wrap the json in ```json fences even with a schema set
    _FENCE = re.compile(r"^\s*```(?:json)?\s*\n?(.*?)\n?\s*```\s*$", re.DOTALL | re.IGNORECASE)

    def __init__(self, client: VlmClient, settings: Settings) -> None:
        self._client = client
        self._max_retries = settings.vlm_max_retries

    def call(self, messages: list[dict], schema_name: str, response_model: type[ModelT]) -> ModelT:
        schema = response_model.model_json_schema()
        attempt = messages
        for _ in range(self._max_retries + 1):
            raw = self._client.complete_json(attempt, schema_name, schema)
            try:
                return response_model.model_validate_json(self._unfence(raw))
            except ValidationError:
                attempt = [*messages,
                           {"role": "assistant", "content": raw},
                           {"role": "user", "content": self._CORRECTION}]
        raise VlmOutputError(f"vlm reply doesn't match {response_model.__name__}")

    def _unfence(self, raw: str) -> str:
        m = self._FENCE.match(raw)
        return m.group(1) if m else raw.strip()


class PromptStitcher:
    def __init__(self, prompts_dir: Path) -> None:
        self._dir = Path(prompts_dir)
        self._cache: dict[str, dict] = {}

    def stitch(self, agent: str, key: str, values: dict[str, Any],
               images: list[PreparedImage] | None = None) -> list[dict]:
        text = self._template(agent, key).format(**values)
        user: Any = text
        if images:
            user = [*self._image_parts(images), {"type": "text", "text": text}]
        system = self._template(agent, "system").strip()
        return [{"role": "system", "content": system}, {"role": "user", "content": user}]

    def _image_parts(self, images: list[PreparedImage]) -> list[dict]:
        parts = []
        for img in images:
            parts.append({"type": "text", "text": f"Photo {img.photo_id}:"})
            parts.append({"type": "image_url", "image_url": {"url": img.data_url}})
        return parts

    def _template(self, agent: str, key: str) -> str:
        if agent not in self._cache:
            self._cache[agent] = yaml.safe_load((self._dir / f"{agent}.yaml").read_text())
        return self._cache[agent][key]


class ListingLoader:
    _SUPPORTED = {"image/jpeg", "image/png", "image/webp"}

    def __init__(self, settings: Settings) -> None:
        self._max_images = settings.max_images
        self._max_side = settings.max_image_side

    def load(self, req: VerifyRequest) -> Listing:
        images, skipped = self._prepare(sorted(req.photos, key=lambda p: p.position))
        if not images:
            raise InvalidListingError(f"no usable photos for house {req.house_id}")
        return Listing(images=images, skipped=skipped, description=req.description, amenities=req.amenities)

    def _prepare(self, photos: list[PhotoIn]) -> tuple[list[PreparedImage], list[SkippedPhoto]]:
        images, skipped = [], []
        for photo in photos:
            reason = self._skip_reason(photo, len(images))
            img = None if reason else self._encode(photo)
            if img:
                images.append(img)
            else:
                skipped.append(SkippedPhoto(photo_id=photo.photo_id, reason=reason or "UNREADABLE"))
        return images, skipped

    def _skip_reason(self, photo: PhotoIn, used: int) -> str | None:
        if photo.content_type.lower() not in self._SUPPORTED:
            return "UNSUPPORTED_TYPE"
        return "OVER_LIMIT" if used >= self._max_images else None

    def _encode(self, photo: PhotoIn) -> PreparedImage | None:
        try:
            raw = base64.b64decode(photo.data, validate=True)
            with Image.open(io.BytesIO(raw)) as src:
                img = ImageOps.exif_transpose(src).convert("RGBA")
        except Exception:
            return None
        # flatten transparency onto white, otherwise it turns black in the jpeg
        canvas = Image.new("RGB", img.size, (255, 255, 255))
        canvas.paste(img, mask=img.getchannel("A"))
        canvas.thumbnail((self._max_side, self._max_side), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        canvas.save(buf, format="JPEG", quality=90)
        url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
        return PreparedImage(photo_id=photo.photo_id, data_url=url)


class TrackedStep:
    # wraps a graph node so each step's start/end shows up in the job log
    def __init__(self, name: str, node: Any, tracker: JobTracker, logger: JobLogger) -> None:
        self._name = name
        self._node = node
        self._tracker = tracker
        self._logger = logger

    def __call__(self, state: VlmState) -> dict:
        job = state["job"]
        self._tracker.step_started(job, self._name)
        self._logger.save(job)
        update = self._node(state)
        self._tracker.step_finished(job, self._name)
        self._logger.save(job)
        return update


class VlmConfig:
    def __init__(self, client: VlmClient, loader: ListingLoader, tracker: JobTracker, logger: JobLogger) -> None:
        self._client = client
        self._loader = loader
        self._tracker = tracker
        self._logger = logger
        # jobs run one at a time
        self._lock = threading.Lock()
        self._graph = self._build_graph()

    @classmethod
    def create(cls, settings: Settings, tracker: JobTracker, logger: JobLogger) -> "VlmConfig":
        openai_client = OpenAI(base_url=settings.lm_studio_base_url, api_key="lm-studio", max_retries=0)
        client = VlmClient(openai_client, settings)
        return cls(client, ListingLoader(settings), tracker, logger)

    @property
    def client(self) -> VlmClient:
        return self._client

    def run(self, job: Job, req: VerifyRequest) -> None:
        with self._lock:
            self._tracker.start(job)
            self._logger.save(job)
            self._invoke(job, req)
            self._logger.save(job)

    def _invoke(self, job: Job, req: VerifyRequest) -> None:
        try:
            final = self._graph.invoke({"job": job, "request": req})
            # TODO: agents go here, for now just report which photos loaded
            listing = final["listing"]
            self._tracker.complete(job, {"photos_used": [i.photo_id for i in listing.images],
                                         "photos_skipped": [s.model_dump() for s in listing.skipped]})
        except PipelineError as err:
            self._tracker.fail(job, err.code, str(err), err.status_code)
        except Exception:
            traceback.print_exc()
            self._tracker.fail(job, "WORKFLOW_ERROR", "unexpected workflow error", 500)

    def _build_graph(self) -> Any:
        graph = StateGraph(VlmState)
        for name, node in {"check_vlm": self._check_vlm, "load_listing": self._load_listing}.items():
            graph.add_node(name, TrackedStep(name, node, self._tracker, self._logger))
        graph.add_edge(START, "check_vlm")
        graph.add_edge("check_vlm", "load_listing")
        graph.add_edge("load_listing", END)
        return graph.compile()

    def _check_vlm(self, state: VlmState) -> dict:
        if not self._client.is_reachable():
            raise VlmUnavailableError("lm studio isn't reachable")
        if not self._client.is_model_loaded():
            raise VlmUnavailableError("model isn't loaded in lm studio")
        return {}

    def _load_listing(self, state: VlmState) -> dict:
        return {"listing": self._loader.load(state["request"])}
