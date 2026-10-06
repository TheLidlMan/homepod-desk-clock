"""Validation for numeric display value transforms."""

from __future__ import annotations

import math
from typing import Any


def validate_number_transform(
    transform: Any, card_type: Any, path: str, error: type[ValueError]
) -> None:
    """Validate optional transforms applied before rendering numeric values."""
    if transform is None:
        return
    if card_type != "number":
        raise error("Value transformers require a number card", path)
    if not isinstance(transform, dict):
        raise error("Value transform must be an object", path)

    allowed = {"precision", "multiply", "add", "absolute", "minimum", "maximum"}
    if unknown := set(transform) - allowed:
        raise error(f"Unsupported value transform: {sorted(unknown)[0]}", path)

    precision = transform.get("precision")
    if precision is not None and (
        type(precision) is not int or not 0 <= precision <= 6
    ):
        raise error("Precision must be 0-6", f"{path}/precision")
    absolute = transform.get("absolute")
    if absolute is not None and not isinstance(absolute, bool):
        raise error("Absolute must be a boolean", f"{path}/absolute")
    for key in ("multiply", "add", "minimum", "maximum"):
        value = transform.get(key)
        if value is not None and (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise error("Transform value must be a finite number", f"{path}/{key}")
    if transform.get("minimum", -math.inf) > transform.get("maximum", math.inf):
        raise error("Minimum must not exceed maximum", path)
