"""Per-display pacing for value and history requests."""

import asyncio
import math
import time


class DataSendLimiter:
    """Wait outside the HTTP lock so controls and status stay responsive."""

    def __init__(self) -> None:
        self.interval = 0.0
        self._completed = float("-inf")
        self._lock = asyncio.Lock()

    def set_rate(self, rate) -> None:
        if isinstance(rate, (float, int)) and not isinstance(rate, bool) and math.isfinite(rate) and rate > 0:
            self.interval = 1.0 / rate

    @property
    def delay(self) -> float:
        return max(0.0, self._completed + self.interval - time.monotonic())

    async def __aenter__(self):
        await self._lock.acquire()
        try:
            while (delay := self.delay) > 0:
                await asyncio.sleep(delay)
        except BaseException:
            self._lock.release()
            raise
        return self

    async def __aexit__(self, *_exc):
        self._completed = time.monotonic()
        self._lock.release()
