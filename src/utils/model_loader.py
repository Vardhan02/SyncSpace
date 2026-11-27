import shutil
import subprocess
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from src.utils.settings import Settings

if TYPE_CHECKING:
    from src.utils.vlmconfig import VlmClient


class ModelLoader:
    # runs once at startup: download missing gguf files, then `lms load` the model
    def __init__(self, settings: Settings, client: "VlmClient", hub_download: Callable[..., str],
                 run_command: Callable[..., subprocess.CompletedProcess] = subprocess.run) -> None:
        self._settings = settings
        self._client = client
        self._hub_download = hub_download
        self._run_command = run_command

    def prepare(self) -> list[str]:
        messages = self._download_missing()
        if not self._client.is_reachable():
            return [*messages, "lm studio server is off, start it with `lms server start --port 1234`"]
        if self._client.is_model_loaded():
            return [*messages, f"model '{self._settings.lm_studio_model}' already loaded"]
        return [*messages, self._lms_load()]

    def files_present(self) -> bool:
        return not self._missing_files()

    def _download_missing(self) -> list[str]:
        missing = self._missing_files()
        s = self._settings
        for name in missing:
            self._hub_download(repo_id=s.model_repo, filename=name,
                               local_dir=str(s.model_dir), token=s.hf_token or None)
        return [f"downloaded {name}" for name in missing]

    def _missing_files(self) -> list[str]:
        required = [self._settings.model_file, self._settings.mmproj_file]
        return [name for name in required if not (self._settings.model_dir / name).is_file()]

    def _lms_load(self) -> str:
        # lms isn't always on PATH, fall back to the default install spot
        lms = shutil.which("lms") or str(Path.home() / ".lmstudio" / "bin" / "lms")
        model = self._settings.lm_studio_model
        command = [lms, "load", model, "--identifier", model,
                   "--context-length", str(self._settings.lms_context_length), "--gpu", "max", "-y"]
        try:
            done = self._run_command(command, capture_output=True, text=True, timeout=600)
        except (OSError, subprocess.TimeoutExpired) as err:
            return f"couldn't run `lms load`: {err}"
        if done.returncode != 0:
            return f"`lms load` failed: {(done.stderr or done.stdout).strip()[:300]}"
        return f"loaded '{model}' into lm studio"
