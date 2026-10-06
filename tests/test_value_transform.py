"""Numeric value transform validation tests."""

import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "value_transform",
    Path(__file__).parents[1]
    / "custom_components/mini_display/value_transform.py",
)
value_transform = importlib.util.module_from_spec(spec)
spec.loader.exec_module(value_transform)


class ValueTransformValidationTests(unittest.TestCase):
    def test_accepts_complete_number_transform(self):
        value_transform.validate_number_transform(
            {
                "precision": 2,
                "multiply": 1.8,
                "add": 32,
                "absolute": True,
                "minimum": 0,
                "maximum": 100,
            },
            "number",
            "/valueTransform",
            ValueError,
        )

    def test_rejects_invalid_precision(self):
        with self.assertRaises(ValueError):
            value_transform.validate_number_transform(
                {"precision": 7}, "number", "/valueTransform", ValueError
            )

    def test_rejects_reversed_clamp(self):
        with self.assertRaises(ValueError):
            value_transform.validate_number_transform(
                {"minimum": 20, "maximum": 10},
                "number",
                "/valueTransform",
                ValueError,
            )


if __name__ == "__main__":
    unittest.main()
