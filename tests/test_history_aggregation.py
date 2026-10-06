"""Recorder state aggregation tests, no Home Assistant installation needed."""
import importlib.util
from pathlib import Path
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

path = Path(__file__).resolve().parents[1] / "custom_components/mini_display/history_aggregation.py"
spec = importlib.util.spec_from_file_location("history_aggregation", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def state(at, value):
    return SimpleNamespace(last_updated=datetime.fromtimestamp(at, timezone.utc), state=str(value))


class AggregationTests(unittest.TestCase):
    def aggregate(self, states, mode="mean"):
        return module.aggregate_history(states, 0, 25, 10, 3, mode)

    def test_time_weighted_mean(self):
        self.assertEqual(self.aggregate([state(0, 10), state(9, 20)]), [11, 20, 20])

    def test_unavailable_and_empty_are_not_zero(self):
        self.assertEqual(self.aggregate([]), [None, None, None])
        self.assertEqual(self.aggregate([state(0, 0), state(10, "unavailable"), state(20, 8)]), [0, None, 8])

    def test_seed_and_partial_bucket(self):
        self.assertEqual(self.aggregate([state(-100, 7)]), [7, 7, 7])
        self.assertEqual(self.aggregate([state(24, 7)]), [None, None, 7])

    def test_other_aggregations(self):
        states = [state(0, 20), state(5, 10), state(9, 15)]
        self.assertEqual(self.aggregate(states, "min"), [10, 15, 15])
        self.assertEqual(self.aggregate(states, "max"), [20, 15, 15])
        self.assertEqual(self.aggregate(states, "last"), [15, 15, 15])

    def test_invalid_values(self):
        self.assertEqual(self.aggregate([state(0, "nan"), state(10, "inf"), state(20, 1e40)]), [None, None, None])


if __name__ == "__main__":
    unittest.main()
