from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


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


class AmenityDetection(BaseModel):
    # amenity gets narrowed to the selected names at call time
    model_config = ConfigDict(extra="forbid")

    amenity: str
    evidence: str
    visible: bool


class PhotoDetections(BaseModel):
    # describe the photo first, then a yes/no per amenity
    model_config = ConfigDict(extra="forbid")

    photo_shows: str
    detections: list[AmenityDetection]


class Evidence(BaseModel):
    photo_id: int
    note: str


class AmenityCheck(BaseModel):
    # evidence only set when verified
    name: str
    verified: bool
    evidence: list[Evidence] | None = None


class AmenitiesSummary(BaseModel):
    selected: int
    verified: int
    not_verified: int


class AmenitiesResult(BaseModel):
    house_id: int
    photos_used: list[int]
    photos_skipped: list[SkippedPhoto]
    amenities: list[AmenityCheck]
    summary: AmenitiesSummary


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
