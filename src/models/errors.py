class PipelineError(Exception):
    # code + status_code end up on the failed job
    code = "WORKFLOW_ERROR"
    status_code = 500


class VlmUnavailableError(PipelineError):
    code = "VLM_UNAVAILABLE"
    status_code = 503
