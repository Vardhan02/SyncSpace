from src.models.schemas import AgentName, VerificationStatus
from src.utils.job_tracker import JobTracker


class VerificationReport:
    # builds the one response the backend polls: overall status, verification_status, and the latest
    # run of each agent as the log
    def __init__(self, tracker: JobTracker) -> None:
        self._tracker = tracker

    def build(self, house_id: int, runs: dict[str, dict]) -> dict:
        status, code = self._overall(runs)
        body = {
            "house_id": house_id,
            "status": status,
            "status_code": code,
            "meaning": self._tracker.meaning(status, code),
            "verification_status": None,
        }
        if status == "FAILED":
            body["verification_status"] = VerificationStatus.NOT_SUFFICIENT_DATA.value
            body["error"] = next(r["error"] for r in runs.values() if r["status"] == "FAILED")
        elif status == "COMPLETED":
            amenities = runs[AgentName.AMENITIES_VERIFY.value]["result"]["summary"]
            claims = runs[AgentName.DESC_AUDIT.value]["result"]["summary"]
            body["verification_status"] = self.decide(amenities, claims).value
        body["log"] = runs
        return body

    def decide(self, amenities: dict, claims: dict) -> VerificationStatus:
        # each side is (verified, out of); a side with nothing to check is left out
        sides = [(amenities["verified"], amenities["selected"]), (claims["verified"], claims["total_claims"])]
        sides = [(v, total) for v, total in sides if total > 0]
        if not sides:
            return VerificationStatus.NOT_SUFFICIENT_DATA
        if all(v * 3 >= total * 2 for v, total in sides):  # at least 2/3, without float rounding
            return VerificationStatus.APPROVED
        if sum(v for v, _ in sides) == 0:
            return VerificationStatus.REJECTED
        return VerificationStatus.NOT_SUFFICIENT_DATA

    def _overall(self, runs: dict[str, dict]) -> tuple[str, int]:
        statuses = [r["status"] for r in runs.values()]
        failed = [r for r in runs.values() if r["status"] == "FAILED"]
        if failed:
            return "FAILED", failed[0]["status_code"]
        if all(s == "COMPLETED" for s in statuses):
            return "COMPLETED", 200
        if all(s == "PENDING" for s in statuses):
            return "PENDING", 202
        return "RUNNING", 202
