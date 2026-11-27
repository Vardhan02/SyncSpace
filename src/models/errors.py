class PipelineError(Exception):
    # code + status_code end up on the failed job
    code = "WORKFLOW_ERROR"
    status_code = 500


class InvalidListingError(PipelineError):
    code = "INVALID_LISTING"
    status_code = 422


class InvalidDescriptionError(PipelineError):
    code = "INVALID_DESCRIPTION"
    status_code = 422


class VlmOutputError(PipelineError):
    code = "VLM_BAD_OUTPUT"
    status_code = 502


class VlmUnavailableError(PipelineError):
    code = "VLM_UNAVAILABLE"
    status_code = 503
