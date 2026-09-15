import json
import logging
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from core.config import settings


logger = logging.getLogger("guidely.query")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


_LOG_PATH = settings.data_dir / "query_log.jsonl"
_lock = Lock()
_recent_latencies: deque[float] = deque(maxlen=1000)
_counters: dict[str, Any] = {
    "queries_served": 0,
    "total_latency_ms": 0.0,
    "cache_hits": 0,
    "cache_misses": 0,
    "total_errors": 0,
    "errors": {},
}


def _ensure_log_directory() -> None:
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def log_query(
    query: str,
    latency_ms: float,
    retrieved_chunk_ids: list[str],
    cache_hit: bool,
    error_type: str | None = None,
) -> dict[str, Any]:
    """Record one query and update process-local aggregate metrics.

    Logging is deliberately best-effort: an unavailable metrics file must not
    turn an otherwise completed request into a server error.
    """

    try:
        latency = max(0.0, float(latency_ms))
    except (TypeError, ValueError):
        latency = 0.0

    entry: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query": str(query),
        "latency_ms": latency,
        "retrieved_chunk_ids": [str(chunk_id) for chunk_id in retrieved_chunk_ids],
        "cache_hit": bool(cache_hit),
        "error_type": error_type,
    }

    with _lock:
        _recent_latencies.append(latency)
        _counters["queries_served"] += 1
        _counters["total_latency_ms"] += latency
        if entry["cache_hit"]:
            _counters["cache_hits"] += 1
        else:
            _counters["cache_misses"] += 1
        if error_type:
            _counters["total_errors"] += 1
            errors = _counters["errors"]
            errors[error_type] = errors.get(error_type, 0) + 1

    _ensure_log_directory()
    try:
        with _LOG_PATH.open("a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n")
    except OSError:
        logger.exception("Unable to write query log to %s", _LOG_PATH)

    logger.info(
        "query served in %.1fms cache_hit=%s error_type=%s",
        latency,
        entry["cache_hit"],
        error_type or "none",
    )
    return entry


def log_error(error_type: str, message: str) -> None:
    """Update error counters for errors that are not part of a query lifecycle."""

    with _lock:
        _counters["total_errors"] += 1
        errors = _counters["errors"]
        errors[error_type] = errors.get(error_type, 0) + 1
    logger.error("%s: %s", error_type, message)


def get_metrics_snapshot() -> dict[str, Any]:
    """Return a consistent snapshot of the process-local query metrics."""

    with _lock:
        latencies = sorted(_recent_latencies)
        count = len(latencies)
        if count:
            median_index = count // 2
            if count % 2:
                median = latencies[median_index]
            else:
                median = (latencies[median_index - 1] + latencies[median_index]) / 2
            p95_index = max(0, int((count - 1) * 0.95))
            p95 = latencies[p95_index]
        else:
            median = 0.0
            p95 = 0.0

        queries_served = _counters["queries_served"]
        cache_total = _counters["cache_hits"] + _counters["cache_misses"]
        cache_hit_rate = _counters["cache_hits"] / cache_total if cache_total else 0.0
        average_latency = (
            _counters["total_latency_ms"] / queries_served if queries_served else 0.0
        )

        return {
            "queries_served": queries_served,
            "total_queries": queries_served,
            "total_latency_ms": round(_counters["total_latency_ms"], 3),
            "average_latency_ms": round(average_latency, 3),
            "latency_ms_average": round(average_latency, 3),
            "latency_ms_median": round(median, 3),
            "latency_ms_p50": round(median, 3),
            "latency_ms_p95": round(p95, 3),
            "cache_hits": _counters["cache_hits"],
            "cache_misses": _counters["cache_misses"],
            "cache_hit_rate": round(cache_hit_rate, 4),
            "total_errors": _counters["total_errors"],
            "errors": dict(_counters["errors"]),
        }


def reset_metrics() -> None:
    """Clear in-memory metrics; useful for tests and controlled restarts."""

    with _lock:
        _recent_latencies.clear()
        for key in (
            "queries_served",
            "total_latency_ms",
            "cache_hits",
            "cache_misses",
            "total_errors",
        ):
            _counters[key] = 0
        _counters["errors"] = {}
