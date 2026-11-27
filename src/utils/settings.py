import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict


class Settings(BaseModel):
    # every field can be overridden by the env var with the same name in caps
    model_config = ConfigDict(frozen=True, protected_namespaces=())

    models_dir: str = "VLMmodels"
    model_repo: str = "lmstudio-community/Qwen2.5-VL-3B-Instruct-GGUF"
    model_file: str = "Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf"
    mmproj_file: str = "mmproj-model-f16.gguf"
    hf_token: str = ""

    lm_studio_base_url: str = "http://localhost:1234/v1"
    lm_studio_model: str = "qwen2.5-vl-3b-instruct"
    lm_studio_timeout_s: float = 120.0
    lms_context_length: int = 16384

    vlm_temperature: float = 0.0
    vlm_seed: int = 42
    vlm_max_retries: int = 1
    vlm_max_tokens: int = 2048

    logs_dir: str = "logs"

    max_images: int = 8
    max_image_side: int = 1024
    description_min_chars: int = 20
    description_max_chars: int = 2000
    max_claims: int = 10

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        values = {name: os.environ[name.upper()] for name in cls.model_fields if name.upper() in os.environ}
        return cls(**values)

    @property
    def model_dir(self) -> Path:
        return Path(self.models_dir) / self.model_repo
