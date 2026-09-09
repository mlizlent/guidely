import json
import logging
import time
from collections import deque
from statistics import median
from threading import Lock

from core.config import settings

logger = logging.getLogger("guidely")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

_LOG_PATH = settings.data_dir / "query_log.jsonl"
_lock = Lock()

_recent_latencies: deque[float] = deque(maxlen=500)
_counters = {
    "queries_served": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "errors": {},  # error_code -> count
}


def log_query(
    query: str,
    latency_ms: float,
    retrieved_chunk_ids: list[str],
    cache_hit: bool,
    error_type: str | None = None,
) -> None:
    entry = {
        "timestamp": time.time(),
        "query": query,
        "latency_ms": latency_ms,
        "retrieved_chunk_ids": retrieved_chunk_ids,
        "cache_hit": cache_hit,
        "error_type": error_type,
    }
    with _lock:
        _recent_latencies.append(latency_ms)
        _counters["queries_served"] += 1
        if cache_hit:
            _counters["cache_hits"] += 1
        else:
            _counters["cache_misses"] += 1
        if error_type:
            _counters["errors"][error_type] = _counters["errors"].get(error_type, 0) + 1

    with open(_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    logger.info("query served in %.1fms (cache_hit=%s)", latency_ms, cache_hit)


def log_error(error_type: str, message: str) -> None:
    with _lock:
        _counters["errors"][error_type] = _counters["errors"].get(error_type, 0) + 1
    logger.error("%s: %s", error_type, message)


def get_metrics_snapshot() -> dict:
    with _lock:
        latencies = sorted(_recent_latencies)
        n = len(latencies)
        p50 = median(latencies) if n else 0.0
        p95 = latencies[max(int(n * 0.95) - 1, 0)] if n else 0.0
        total = _counters["cache_hits"] + _counters["cache_misses"]
        cache_hit_rate = (_counters["cache_hits"] / total) if total else 0.0

        return {
            "queries_served": _counters["queries_served"],
            "latency_ms_median": round(p50, 1),
            "latency_ms_p95": round(p95, 1),
            "cache_hit_rate": round(cache_hit_rate, 3),
            "errors": dict(_counters["errors"]),
        }