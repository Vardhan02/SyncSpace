from typing import TYPE_CHECKING, Literal

from pydantic import create_model

from src.models.errors import InvalidDescriptionError, VlmOutputError
from src.models.schemas import (AuditedClaim, AuditSummary, ClaimStatus, DescAuditResult, ExtractedClaims,
                                PhotoClaimCheck, PhotoClaimChecks, PreparedImage, SkippedPhoto)
from src.utils.settings import Settings

if TYPE_CHECKING:
    from src.utils.vlmconfig import PromptStitcher, VlmCaller, VlmState


class DescAuditAgent:
    # extract claims from the description, then check all claims one photo at a time and combine in code
    NAME = "desc_audit"

    def __init__(self, stitcher: "PromptStitcher", caller: "VlmCaller", settings: Settings) -> None:
        self._stitcher = stitcher
        self._caller = caller
        self._settings = settings

    def extract(self, state: "VlmState") -> dict:
        # text only, no photos at this point
        text = self._check_length(state["listing"].description)
        values = {"max_claims": self._settings.max_claims, "description": text}
        messages = self._stitcher.stitch(self.NAME, "extract", values)
        reply = self._caller.call(messages, "extracted_claims", ExtractedClaims)
        claims = self._dedupe(reply.claims)
        if not claims:
            return {"claims": [], "result": self._result(state, [], [], [])}
        return {"claims": claims}

    def verify(self, state: "VlmState") -> dict:
        claims = state["claims"]
        listed = "\n".join(f"- {c}" for c in claims)
        schema = self._check_schema(claims)
        per_photo, failed = {}, []
        for img in state["listing"].images:
            try:
                per_photo[img.photo_id] = self._check_photo(img, listed, schema)
            except VlmOutputError:
                failed.append(SkippedPhoto(photo_id=img.photo_id, reason="VLM_BAD_OUTPUT"))
        if not per_photo:
            raise VlmOutputError("model gave bad output for every photo")
        audited = [self._combine(c, per_photo) for c in claims]
        return {"result": self._result(state, audited, list(per_photo), failed)}

    def _check_length(self, description: str) -> str:
        text = description.strip()
        lo, hi = self._settings.description_min_chars, self._settings.description_max_chars
        if not lo <= len(text) <= hi:
            raise InvalidDescriptionError(f"description must be {lo}-{hi} characters (got {len(text)})")
        return text

    def _dedupe(self, claims: list[str]) -> list[str]:
        seen, kept = set(), []
        for c in (c.strip() for c in claims):
            if c and c.lower() not in seen:
                seen.add(c.lower())
                kept.append(c)
        return kept[: self._settings.max_claims]

    def _check_photo(self, img: PreparedImage, listed: str,
                     schema: type[PhotoClaimChecks]) -> dict[str, PhotoClaimCheck]:
        messages = self._stitcher.stitch(self.NAME, "agent", {"claims": listed}, [img])
        reply = self._caller.call(messages, "photo_claim_checks", schema)
        return {c.claim: c for c in reply.checks}

    def _combine(self, claim: str, per_photo: dict[int, dict[str, PhotoClaimCheck]]) -> AuditedClaim:
        # any photo showing it wins; a contradiction only counts if no photo shows it
        for matches, final in [(True, ClaimStatus.VERIFIED), (False, ClaimStatus.CONTRADICTED)]:
            hits = {pid: checks[claim] for pid, checks in per_photo.items()
                    if claim in checks and checks[claim].shows_subject and checks[claim].matches_claim == matches}
            if hits:
                reasoning = " ".join(f"Photo {pid}: {c.reasoning}" for pid, c in hits.items())
                return AuditedClaim(claim=claim, status=final, evidence_photos=list(hits), reasoning=reasoning)
        return AuditedClaim(claim=claim, status=ClaimStatus.NOT_OBSERVABLE, reasoning="Not shown in any photo.")

    def _result(self, state: "VlmState", claims: list[AuditedClaim], used: list[int],
                failed: list[SkippedPhoto]) -> dict:
        res = DescAuditResult(
            house_id=state["job"].house_id,
            photos_used=used,
            photos_skipped=[*state["listing"].skipped, *failed],
            claims=claims,
            summary=self._summary(claims),
        )
        return res.model_dump(mode="json")

    def _summary(self, claims: list[AuditedClaim]) -> AuditSummary:
        count = {s: sum(1 for c in claims if c.status == s) for s in ClaimStatus}
        return AuditSummary(
            total_claims=len(claims),
            verified=count[ClaimStatus.VERIFIED],
            not_observable=count[ClaimStatus.NOT_OBSERVABLE],
            contradicted=count[ClaimStatus.CONTRADICTED],
            has_discrepancies=count[ClaimStatus.CONTRADICTED] > 0,
        )

    def _check_schema(self, claims: list[str]) -> type[PhotoClaimChecks]:
        check = create_model("ListedClaimCheck", __base__=PhotoClaimCheck, claim=(Literal[tuple(claims)], ...))
        return create_model("ListedClaimChecks", __base__=PhotoClaimChecks, checks=(list[check], ...))
