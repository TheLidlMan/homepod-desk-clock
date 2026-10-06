"""Graph snapshot caching and Recorder request contract."""
import importlib
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

package = ModuleType("history_test_package")
package.__path__ = [str(Path(__file__).resolve().parents[1] / "custom_components/mini_display")]
recorder = ModuleType("homeassistant.components.recorder")
recorder.get_instance = Mock()
recorder.history = SimpleNamespace(get_significant_states=Mock())
with patch.dict(sys.modules, {
    "history_test_package": package,
    "homeassistant": ModuleType("homeassistant"),
    "homeassistant.components": ModuleType("homeassistant.components"),
    "homeassistant.components.recorder": recorder,
}):
    module = importlib.import_module("history_test_package.history_data")


class HistoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.query = AsyncMock(return_value={})
        module.get_instance.return_value = SimpleNamespace(async_add_executor_job=self.query)

        async def execute(function, *args):
            return function(*args)

        self.hass = SimpleNamespace(async_add_executor_job=execute)
        self.reader = module.HistoryData(self.hass)
        self.card = {"source": "sensor.power", "graph": {"points": 3, "intervalSeconds": 300}}
        self.dashboard = {"pages": [{"rows": [{"cards": [self.card, self.card]}]}]}

    async def test_deduplication_and_cache(self):
        with patch.object(module.time, "time", return_value=1800000001):
            result = await self.reader.series(self.dashboard)
            self.assertEqual(await self.reader.series(self.dashboard), result)
        self.query.assert_awaited_once()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["values"], [None, None, None])
        query = self.query.call_args.args[0]
        self.assertEqual(query.args[3], ["sensor.power"])
        self.assertTrue(query.keywords["no_attributes"])
        self.assertFalse(query.keywords["significant_changes_only"])
        self.assertEqual(query.args[1].timestamp(), 1799999400)

    async def test_new_bucket_invalidates_cache(self):
        with patch.object(module.time, "time", return_value=1800000001):
            await self.reader.series(self.dashboard)
        with patch.object(module.time, "time", return_value=1800000301):
            await self.reader.series(self.dashboard)
        self.assertEqual(self.query.await_count, 2)

    async def test_no_graphs_no_database_access(self):
        self.assertEqual(await self.reader.series(None), [])
        self.query.assert_not_awaited()

    def test_card_and_background_graph_share_series(self):
        dashboard = {"pages": [{"rows": [{"cards": [
            {"type": "number", "source": "sensor.power", "graph": {
                "type": "line", "points": 15, "intervalSeconds": 120,
                "aggregation": "mean", "lineWidth": 3,
            }},
            {"type": "chart", "source": "sensor.power", "graph": {
                "type": "bar", "points": 15, "intervalSeconds": 120,
                "aggregation": "mean", "barGap": 2,
            }},
        ]}]}]}
        self.assertEqual(module.graph_keys(dashboard), [
            ("sensor.power", 15, 120, "mean")
        ])

    async def test_recorder_failure_does_not_send_empty_replacement(self):
        self.query.side_effect = RuntimeError("recorder unavailable")
        with self.assertLogs(module._LOGGER, level="WARNING"):
            self.assertEqual(await self.reader.series(self.dashboard), [])


if __name__ == "__main__":
    unittest.main()
