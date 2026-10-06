"""Exercise real async pacing without sleeping during tests."""
import asyncio
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("data_rate", Path(__file__).parents[1] / "custom_components/mini_display/data_rate.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DataRateTests(unittest.IsolatedAsyncioTestCase):
    async def test_serializes_requests_at_device_rate(self):
        now = [100.0]
        waits = []

        async def sleep(seconds):
            waits.append(seconds)
            now[0] += seconds

        limiter = module.DataSendLimiter()
        limiter.set_rate(0.1)
        with patch.object(module.time, "monotonic", side_effect=lambda: now[0]), patch.object(module.asyncio, "sleep", side_effect=sleep):
            async with limiter:
                self.assertEqual(now[0], 100)
            async with limiter:
                self.assertEqual(now[0], 110)
            limiter.set_rate(2)
            async with limiter:
                self.assertEqual(now[0], 110.5)
            self.assertEqual(waits, [10, 0.5])

    async def test_cancelled_wait_releases_lock(self):
        limiter = module.DataSendLimiter()
        limiter.set_rate(1)
        async with limiter:
            pass
        with patch.object(module.asyncio, "sleep", side_effect=asyncio.CancelledError):
            with self.assertRaises(asyncio.CancelledError):
                async with limiter:
                    self.fail("cancelled request must not send")
        self.assertFalse(limiter._lock.locked())

    def test_bad_status_does_not_change_rate(self):
        limiter = module.DataSendLimiter()
        limiter.set_rate(10)
        for bad in (None, 0, -1, float("nan"), float("inf"), True, "60"):
            limiter.set_rate(bad)
            self.assertEqual(limiter.interval, 0.1)


if __name__ == "__main__":
    unittest.main()
