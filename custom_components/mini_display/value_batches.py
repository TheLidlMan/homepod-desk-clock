"""Bound value updates for the display's small JSON parser."""

from __future__ import annotations

import json
from typing import Any


# Request body and ArduinoJson document coexist briefly on ESP8266. Keep each
# chunk small enough for a fragmented heap while a rendered scene is active.
MAX_VALUE_BATCH_BYTES = 768


def split_value_batches(
    values: dict[str, Any], limit: int = MAX_VALUE_BATCH_BYTES
) -> list[dict[str, Any]]:
    """Split values without splitting one value or changing insertion order."""
    if not values:
        return [{}]
    batches: list[dict[str, Any]] = []
    batch: dict[str, Any] = {}
    for key, value in values.items():
        batch[key] = value
        size = len(
            json.dumps(
                {"values": batch, "render": False},
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
        )
        if size <= limit or len(batch) == 1:
            continue
        batch.pop(key)
        batches.append(batch)
        batch = {key: value}
    batches.append(batch)
    return batches
