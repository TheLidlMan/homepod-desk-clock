"""Value update batching tests."""

import importlib.util
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "value_batches",
    Path(__file__).parents[1]
    / "custom_components/mini_display/value_batches.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ValueBatchTests(unittest.TestCase):
    def test_batches_fit_and_preserve_values(self):
        values = {
            f"sensor.source_{index}": {
                "state": "x" * 120,
                "available": True,
                "lastChanged": "2026-09-10T09:30:00+00:00",
            }
            for index in range(32)
        }
        batches = module.split_value_batches(values, 700)
        self.assertGreater(len(batches), 1)
        self.assertEqual(
            {key: value for batch in batches for key, value in batch.items()},
            values,
        )
        for batch in batches:
            payload = json.dumps(
                {"values": batch, "render": False},
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
            self.assertLessEqual(len(payload), 700)

    def test_empty_and_oversized_single_value(self):
        self.assertEqual(module.split_value_batches({}), [{}])
        value = {"sensor.large": {"state": "x" * 1000}}
        self.assertEqual(module.split_value_batches(value, 100), [value])


if __name__ == "__main__":
    unittest.main()
