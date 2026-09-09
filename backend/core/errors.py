from fastapi import Request
from fastapi.responses import JSONResponse


class GuidelyError(Exception):
    """Base class for all handled application errors. Carries an error code
    and HTTP status so the API always returns a clean, predictable JSON body."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class EmptyQueryError(GuidelyError):
    def __init__(self):
        super().__init__("empty_query", "Query cannot be empty.", 400)


class MissingModelKeyError(GuidelyError):
    def __init__(self):
        super().__init__("missing_model_key", "No LLM/embedding API key is configured.", 503)


class UnsupportedFileError(GuidelyError):
    def __init__(self, filename: str):
        super().__init__("unsupported_file", f"'{filename}' is not a supported file type.", 422)


class CorruptedFileError(GuidelyError):
    def __init__(self, filename: str):
        super().__init__("corrupted_file", f"Could not read '{filename}' — the file may be corrupted.", 422)


class NoResultsError(GuidelyError):
    def __init__(self):
        super().__init__("no_results", "No relevant documents were found for this question.", 404)


class ModelTimeoutError(GuidelyError):
    def __init__(self):
        super().__init__("model_timeout", "The language model took too long to respond.", 504)


class DocumentNotFoundError(GuidelyError):
    def __init__(self, doc_id: str):
        super().__init__("document_not_found", f"Document '{doc_id}' was not found.", 404)


async def guidely_error_handler(request: Request, exc: GuidelyError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "Something went wrong. Please try again."}},
    )