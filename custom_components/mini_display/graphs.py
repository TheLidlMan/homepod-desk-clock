"""Bounded graph history and free-layout validation shared by dashboard flows."""

import math
from typing import Any


def validate_graphs(document: dict[str, Any], error: type[ValueError]) -> None:
    for pi, page in enumerate(document["pages"]):
        free = page.get("layout", "rows") == "free"
        if page.get("layout", "rows") not in {"free", "rows"}:
            raise error("Unsupported page layout", f"/pages/{pi}/layout")
        cards = [(ri, ci, card) for ri, row in enumerate(page["rows"])
                 for ci, card in enumerate(row["cards"])]
        if len(cards) > 18:
            raise error("This display supports up to 18 items per page", f"/pages/{pi}")
        for ri, ci, card in cards:
            path = f"/pages/{pi}/rows/{ri}/cards/{ci}"
            if free:
                for name in ("frame", "titleFrame", "valueFrame"):
                    if name != "frame" and name not in card:
                        continue
                    frame = card.get(name)
                    if not isinstance(frame, dict) or any(
                        not number(frame.get(key)) for key in ("x", "y", "width", "height")
                    ):
                        raise error("Item requires a position and size", f"{path}/{name}")
                    if (frame["x"] < 0 or frame["y"] < 0 or frame["width"] < 2 or
                        frame["height"] < 2 or frame["x"] + frame["width"] > 100.01 or
                        frame["y"] + frame["height"] > 100.01):
                        raise error("Item must fit on the screen", f"{path}/{name}")
            graph = card.get("graph")
            if graph is None:
                if card.get("type") == "chart":
                    raise error("Chart requires graph settings", f"{path}/graph")
                continue
            if not isinstance(graph, dict):
                raise error("Invalid graph settings", f"{path}/graph")
            source = graph.get("source") or card.get("source")
            if not isinstance(source, str) or not 1 <= len(source) <= 64:
                raise error("Graph requires a numeric entity", f"{path}/graph/source")
            for key, default, low, high in (
                ("points", 48, 2, 120), ("intervalSeconds", 300, 30, 86400),
                ("opacity", 50, 0, 100), ("labelEvery", 6, 1, 120), ("decimals", 1, 0, 3),
                ("lineWidth", 1, 1, 4), ("fillOpacity", 0, 0, 100),
                ("pointSize", 1, 1, 4), ("barGap", 1, 0, 8),
                ("gridLines", 0, 0, 8), ("gridOpacity", 20, 0, 100),
                ("scalePadding", 5, 0, 50),
            ):
                value = graph.get(key, default)
                if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
                    raise error(f"{key} must be {low}-{high}", f"{path}/graph/{key}")
            if graph.get("type", "bar") not in {"bar", "line"}:
                raise error("Unsupported chart type", f"{path}/graph/type")
            if graph.get("scale", "zero") not in {"zero", "fit"}:
                raise error("Unsupported chart scale", f"{path}/graph/scale")
            if graph.get("aggregation", "mean") not in {"mean", "min", "max", "last"}:
                raise error("Unsupported aggregation", f"{path}/graph/aggregation")
            if not isinstance(graph.get("showPoints", False), bool):
                raise error("showPoints must be a boolean", f"{path}/graph/showPoints")
            for key in ("minimum", "maximum"):
                if key in graph and not number(graph[key]):
                    raise error("Chart limit must be a finite number", f"{path}/graph/{key}")
            if graph.get("minimum", -math.inf) >= graph.get("maximum", math.inf):
                raise error("Minimum must be below maximum", f"{path}/graph")


def number(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)
