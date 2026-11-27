import re
from typing import TYPE_CHECKING, Literal

from pydantic import create_model

from src.models.errors import VlmOutputError
from src.models.schemas import (AmenitiesResult, AmenitiesSummary, AmenityCheck, AmenityDetection, Evidence,
                                PhotoDetections, PreparedImage, SkippedPhoto)

if TYPE_CHECKING:
    from src.utils.vlmconfig import PromptStitcher, VlmCaller, VlmState


class AmenitiesVerifyAgent:
    # checks the landlord's selected amenities against each photo, one vlm call per photo
    NAME = "amenities_verify"
    # the 3b model says visible=true on guesses ("large windows suggest a balcony") even when told not
    # to, but it gives itself away in the wording. "suggests" is also used about things it really sees
    # ("the dishwasher is visible, suggesting..."), so that one only counts when nothing is said to be seen
    _GUESS = re.compile(r"\b(could|might|may|maybe|likely|possib\w*|perhaps|probably|infer\w*)\b", re.IGNORECASE)
    _SUGGEST = re.compile(r"\bsuggest\w*", re.IGNORECASE)
    _SEEN = re.compile(r"\b(visible|seen|present|shows?|shown)\b", re.IGNORECASE)
    # it also says visible=true next to "no swimming pool is visible", so trust the sentence over the flag
    _NEGATED = re.compile(r"\b(no|not|none|without|isn't|aren't|doesn't|don't|cannot|can't)\b", re.IGNORECASE)

    def __init__(self, stitcher: "PromptStitcher", caller: "VlmCaller") -> None:
        self._stitcher = stitcher
        self._caller = caller

    def run(self, state: "VlmState") -> dict:
        listing = state["listing"]
        selected = listing.amenities
        evidence, used, failed = {}, [], []
        if selected:
            evidence, used, failed = self._scan(listing.images, selected)
            if not used:
                raise VlmOutputError("model gave bad output for every photo")
        checks = self._checks(selected, evidence)
        result = AmenitiesResult(
            house_id=state["job"].house_id,
            photos_used=used,
            photos_skipped=[*listing.skipped, *failed],
            amenities=checks,
            summary=self._summary(checks),
        )
        return {"result": result.model_dump(mode="json", exclude_none=True)}

    def _scan(self, images: list[PreparedImage],
              selected: list[str]) -> tuple[dict[str, list[Evidence]], list[int], list[SkippedPhoto]]:
        schema = self._build_schema(selected)
        evidence: dict[str, list[Evidence]] = {}
        used, failed = [], []
        for img in images:
            try:
                found = self._detect(img, selected, schema)
            except VlmOutputError:
                # one bad photo shouldn't sink the whole job
                failed.append(SkippedPhoto(photo_id=img.photo_id, reason="VLM_BAD_OUTPUT"))
                continue
            used.append(img.photo_id)
            for d in found:
                if not d.visible or self._guessed(d.evidence):
                    continue
                evidence.setdefault(d.amenity, []).append(Evidence(photo_id=img.photo_id, note=d.evidence))
        return evidence, used, failed

    def _detect(self, img: PreparedImage, selected: list[str], schema: type[PhotoDetections]) -> list[AmenityDetection]:
        names = "\n".join(f"- {name}" for name in selected)
        messages = self._stitcher.stitch(self.NAME, "agent", {"amenity_list": names}, [img])
        reply = self._caller.call(messages, "photo_amenities", schema)
        # model sometimes repeats an amenity, keep the last one
        return list({d.amenity: d for d in reply.detections}.values())

    def _guessed(self, note: str) -> bool:
        if self._GUESS.search(note) or self._NEGATED.search(note):
            return True
        return bool(self._SUGGEST.search(note)) and not self._SEEN.search(note)

    def _checks(self, selected: list[str], evidence: dict[str, list[Evidence]]) -> list[AmenityCheck]:
        return [AmenityCheck(name=name, verified=name in evidence, evidence=evidence.get(name)) for name in selected]

    def _summary(self, checks: list[AmenityCheck]) -> AmenitiesSummary:
        verified = sum(1 for c in checks if c.verified)
        return AmenitiesSummary(selected=len(checks), verified=verified, not_verified=len(checks) - verified)

    def _build_schema(self, names: list[str]) -> type[PhotoDetections]:
        # only the selected names are allowed, so the model can't report anything else
        detection = create_model("SelectedDetection", __base__=AmenityDetection, amenity=(Literal[tuple(names)], ...))
        return create_model("SelectedPhotoDetections", __base__=PhotoDetections, detections=(list[detection], ...))
