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
    # same idea as PhotoClaimChecks: describe the photo first, then a yes/no per amenity
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


class ClaimStatus(str, Enum):
    VERIFIED = "VERIFIED"
    NOT_OBSERVABLE = "NOT_OBSERVABLE"
    CONTRADICTED = "CONTRADICTED"


class ExtractedClaims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claims: list[str]


class PhotoClaimCheck(BaseModel):
    # claim gets narrowed to the real claims at call time; writing it out first keeps the model from
    # losing track of which one it's on. two yes/no answers instead of one 3-way status, the small
    # model kept saying "contradicted" for photos of a different room
    model_config = ConfigDict(extra="forbid")

    claim: str
    reasoning: str
    shows_subject: bool
    matches_claim: bool


class PhotoClaimChecks(BaseModel):
    # vlm reply for one photo against all claims. photo_shows comes first so the model describes
    # the photo before it looks at the claims (asked one claim at a time it just agreed with them)
    model_config = ConfigDict(extra="forbid")

    photo_shows: str
    checks: list[PhotoClaimCheck]


class AuditedClaim(BaseModel):
    claim: str
    status: ClaimStatus
    evidence_photos: list[int] = Field(default_factory=list)
    reasoning: str = ""


class AuditSummary(BaseModel):
    total_claims: int
    verified: int
    not_observable: int
    contradicted: int
    has_discrepancies: bool


class DescAuditResult(BaseModel):
    house_id: int
    photos_used: list[int]
    photos_skipped: list[SkippedPhoto]
    claims: list[AuditedClaim]
    summary: AuditSummary


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
