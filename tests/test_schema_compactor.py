"""Schema-driven wire compaction tests without Home Assistant dependencies."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "mini_display"
    / "schema_compactor.py"
)
SPEC = importlib.util.spec_from_file_location("schema_compactor", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class SchemaCompactorTests(unittest.TestCase):
    def test_removes_defaults_and_inactive_fields(self):
        dashboard = {
            "version": 1,
            "defaults": {"pageDurationSeconds": 10, "theme": "dark"},
            "pages": [{
                "id": "page",
                "layout": "rows",
                "enabled": True,
                "showTitle": True,
                "titlePosition": "top",
                "transparentCards": False,
                "transition": {"type": "random", "speed": "normal"},
                "rows": [{
                    "weight": 1,
                    "gap": "small",
                    "showTitle": True,
                    "cards": [{
                        "type": "number",
                        "source": "sensor.power",
                        "progress": "none",
                        "backgroundMode": "color",
                        "backgroundImage": "32725098c587eae7",
                        "valueTransform": {
                            "precision": 0,
                            "multiply": 1,
                            "add": 0,
                            "absolute": False,
                        },
                        "graph": {
                            "type": "bar",
                            "aggregation": "mean",
                            "points": 48,
                            "intervalSeconds": 300,
                            "color": "accent",
                            "opacity": 50,
                        },
                    }],
                }],
            }],
        }
        original = deepcopy(dashboard)

        compact = module.compact_with_schema(dashboard)

        self.assertEqual(dashboard, original)
        self.assertNotIn("defaults", compact)
        page = compact["pages"][0]
        self.assertEqual(set(page), {"id", "transition", "rows"})
        self.assertEqual(page["transition"], {"type": "random"})
        row = page["rows"][0]
        self.assertEqual(set(row), {"cards"})
        card = row["cards"][0]
        self.assertNotIn("backgroundMode", card)
        self.assertNotIn("backgroundImage", card)
        self.assertEqual(card["valueTransform"], {"precision": 0})
        self.assertNotIn("graph", card)

    def test_keeps_active_image_and_context_sensitive_style(self):
        dashboard = {
            "version": 1,
            "pages": [{
                "id": "page",
                "rows": [{"cards": [{
                    "type": "text",
                    "text": "hello",
                    "backgroundMode": "image",
                    "backgroundImage": "32725098c587eae7",
                    "titleStyle": {
                        "fontFamily": "default",
                        "fontSize": "auto",
                        "horizontalAlign": "center",
                        "verticalAlign": "middle",
                    },
                }]}],
            }],
        }

        card = module.compact_with_schema(dashboard)["pages"][0]["rows"][0]["cards"][0]

        self.assertEqual(card["backgroundMode"], "image")
        self.assertEqual(card["backgroundImage"], "32725098c587eae7")
        self.assertEqual(
            card["titleStyle"],
            dashboard["pages"][0]["rows"][0]["cards"][0]["titleStyle"],
        )


if __name__ == "__main__":
    unittest.main()
