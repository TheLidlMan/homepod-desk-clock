"""Recorder-backed, bounded display graph snapshots."""

import asyncio
from datetime import datetime, timezone
from functools import partial
import logging
import time

from homeassistant.components.recorder import get_instance, history

from .history_aggregation import aggregate_history

_LOGGER = logging.getLogger(__name__)


def graph_keys(dashboard):
    keys = set()
    for page in (dashboard or {}).get("pages", []):
        for row in page.get("rows", []):
            for card in row.get("cards", []):
                graph = card.get("graph")
                if graph is not None:
                    keys.add((graph.get("source") or card.get("source"),
                              graph.get("points", 48), graph.get("intervalSeconds", 300),
                              graph.get("aggregation", "mean")))
    return sorted(keys)


class HistoryData:
    def __init__(self, hass):
        self.hass = hass
        self._cache = {}
        self._lock = asyncio.Lock()

    async def series(self, dashboard):
        keys = graph_keys(dashboard)
        async with self._lock:
            self._cache = {key: value for key, value in self._cache.items() if key in keys}
            result = []
            for key in keys:
                source, points, interval, aggregation = key
                now = time.time()
                bucket = int(now // interval)
                cached = self._cache.get(key)
                if cached and time.monotonic() - cached[0] < 60 and cached[1]["bucket"] == bucket:
                    result.append(cached[1])
                    continue
                start = (bucket - points + 1) * interval
                try:
                    states = await get_instance(self.hass).async_add_executor_job(partial(
                        history.get_significant_states, self.hass,
                        datetime.fromtimestamp(start, timezone.utc),
                        datetime.fromtimestamp(now, timezone.utc), [source],
                        significant_changes_only=False, no_attributes=True,
                    ))
                    values = await self.hass.async_add_executor_job(
                        aggregate_history, states.get(source, []), start, now, interval, points, aggregation)
                except Exception:
                    _LOGGER.warning("Could not read graph history for %s", source, exc_info=True)
                    continue
                item = dict(source=source, points=points, intervalSeconds=interval,
                            aggregation=aggregation, bucket=bucket, values=values)
                self._cache[key] = (time.monotonic(), item)
                result.append(item)
            return result
