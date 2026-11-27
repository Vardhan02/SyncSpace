from enum import Enum

from pydantic import BaseModel, Field


class PhotoIn(BaseModel):
    photo_id: int
    position: int
    content_type: str
    data: str  # base64, no data: prefix


class VerifyRequest(BaseModel):
    # what the backend POSTs to /listings/verify, see vlm-sample/vlm-request-sample.json
    house_id: int
    landlord_id: str
    description: str
    amenities: list[str]
    photos: list[PhotoIn]


class SkippedPhoto(BaseModel):
    photo_id: int
    reason: str


class PreparedImage(BaseModel):
    photo_id: int
    data_url: str


class Listing(BaseModel):
    images: list[PreparedImage]
    skipped: list[SkippedPhoto]
    description: str
    amenities: list[str]


class AgentName(str, Enum):
    # values double as the section names in the log files
    AMENITIES_VERIFY = "amenities_verify"
    DESC_AUDIT = "desc_audit"


class JobError(BaseModel):
    code: str
    message: str


class Job(BaseModel):
    # this is exactly what gets written to the log
    house_id: int
    landlord_id: str
    job_id: str
    agent: AgentName
    status: str = "PENDING"
    status_code: int = 202
    submitted_at: str
    started_at: str | None = None
    ended_at: str | None = None
    duration_s: float | None = None
    current_step: str | None = None
    steps: dict[str, dict] = Field(default_factory=dict)
    result: dict | None = None
    error: JobError | None = None
