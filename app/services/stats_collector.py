from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Optional
import time

from app.models.schemas import RequestLog
from app.services.config_manager import config_manager


class StatsCollector:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self) -> None:
        self._logs: deque = deque(maxlen=500)
        self._counters: dict = defaultdict(int)
        self._intent_counters: dict = defaultdict(int)
        self._hourly_counters: dict = defaultdict(int)
        self._start_time = time.time()
        self._error_count = 0

    def record_request(self, log: RequestLog) -> None:
        self._logs.append(log)
        self._counters["total"] += 1
        self._intent_counters[log.intent or "unknown"] += 1

        now = datetime.now()
        hour_key = now.strftime("%Y-%m-%d %H")
        self._hourly_counters[hour_key] += 1

        today_key = now.strftime("%Y-%m-%d")
        self._counters[f"today_{today_key}"] += 1

        if "error" in log.response_text.lower() or log.total_latency_ms > 5000:
            self._error_count += 1

    def get_stats(self) -> dict:
        now = datetime.now()
        today_key = now.strftime("%Y-%m-%d")
        today_requests = self._counters.get(f"today_{today_key}", 0)

        total = self._counters.get("total", 0)
        error_rate = self._error_count / total if total > 0 else 0.0

        latencies = [log.total_latency_ms for log in self._logs if log.total_latency_ms > 0]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0

        hourly = []
        for i in range(24):
            hour_dt = now - timedelta(hours=i)
            hour_key = hour_dt.strftime("%Y-%m-%d %H")
            hourly.append({
                "hour": hour_key,
                "count": self._hourly_counters.get(hour_key, 0),
            })
        hourly.reverse()

        return {
            "total_requests": total,
            "today_requests": today_requests,
            "avg_latency_ms": round(avg_latency, 2),
            "error_rate": round(error_rate, 4),
            "intent_distribution": dict(self._intent_counters),
            "hourly_requests": hourly,
            "current_model": config_manager.get("LLM_PROVIDER") or "deepseek",
            "uptime_seconds": int(time.time() - self._start_time),
        }

    def get_logs(self, limit: int = 50, intent_filter: Optional[str] = None) -> list:
        logs = list(self._logs)
        if intent_filter:
            logs = [log for log in logs if log.intent == intent_filter]
        return logs[-limit:]


stats_collector = StatsCollector()
