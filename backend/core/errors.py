from fastapi import Request
from fastapi.responses import JSONResponse


class GuidelyError(Exception):
    """Base exception carrying the HTTP status and stable API error code."""

    def __init__(
        self,
        message: str = "Guidely request failed.",
        status_code: int = 500,
        code: str = "GUIDELY_ERROR",
    ) -> None:
        self.message = str(message)
        self.status_code = int(status_code)
        self.code = str(code)
        super().__init__(self.message)


class DocumentNotFoundError(GuidelyError):
    def __init__(self, doc_id: str | None = None) -> None:
        message = (
            f"Document '{doc_id}' was not found."
            if doc_id is not None
            else "The requested document was not found."
        )
        super().__init__(message, status_code=404, code="DOCUMENT_NOT_FOUND")


class EmptyQueryError(GuidelyError):
    def __init__(self) -> None:
        super().__init__(
            "Query text cannot be empty.",
            status_code=400,
            code="EMPTY_QUERY",
        )


class MissingModelKeyError(GuidelyError):
    def __init__(self) -> None:
        super().__init__(
            "No model API key is configured.",
            status_code=500,
            code="MISSING_MODEL_KEY",
        )


class ModelTimeoutError(GuidelyError):
    def __init__(self) -> None:
        super().__init__(
            "The language model request timed out.",
            status_code=504,
            code="MODEL_TIMEOUT",
        )


# The document pipeline uses these additional domain errors. Keeping them here
# ensures every application error is rendered through the same JSON contract.
class UnsupportedFileError(GuidelyError):
    def __init__(self, filename: str) -> None:
        super().__init__(
            f"File type for '{filename}' is not supported.",
            status_code=422,
            code="UNSUPPORTED_FILE",
        )


class CorruptedFileError(GuidelyError):
    def __init__(self, filename: str) -> None:
        super().__init__(
            f"File '{filename}' could not be read or parsed.",
            status_code=422,
            code="CORRUPTED_FILE",
        )


class NoResultsError(GuidelyError):
    def __init__(self) -> None:
        super().__init__(
            "No indexed documents are available for this query.",
            status_code=404,
            code="NO_RESULTS",
        )


async def guidely_error_handler(request: Request, exc: GuidelyError) -> JSONResponse:
    """Render handled domain errors without leaking implementation details."""

    del request
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": str(exc)},
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Render unexpected failures with a stable, non-sensitive response."""

    del request, exc
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
        },
    )
