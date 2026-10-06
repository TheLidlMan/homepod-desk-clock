"""Schema-driven dashboard wire compaction."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
from typing import Any


with Path(__file__).with_name("dashboard.schema.json").open(encoding="utf-8") as file:
    _ROOT_SCHEMA = json.load(file)


def compact_with_schema(document: dict[str, Any]) -> dict[str, Any]:
    """Drop schema defaults and fields disabled for the wire format."""
    compact = deepcopy(document)
    _compact(compact, _ROOT_SCHEMA)
    return compact


def _resolve(reference: str) -> dict[str, Any]:
    if not reference.startswith("#/"):
        raise ValueError(f"Unsupported schema reference: {reference}")
    value: Any = _ROOT_SCHEMA
    for part in reference[2:].split("/"):
        value = value[part.replace("~1", "/").replace("~0", "~")]
    if not isinstance(value, dict):
        raise ValueError(f"Schema reference is not an object: {reference}")
    return value


def _merge(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(left)
    for key, value in right.items():
        if key == "required":
            result[key] = list(dict.fromkeys([*result.get(key, []), *value]))
        elif isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def _expand(schema: dict[str, Any]) -> dict[str, Any]:
    """Resolve only current schema node, leaving child schemas lazy."""
    result: dict[str, Any] = {}
    reference = schema.get("$ref")
    if isinstance(reference, str):
        result = _merge(result, _expand(_resolve(reference)))
    for item in schema.get("allOf", []):
        if isinstance(item, dict):
            result = _merge(result, _expand(item))
    return _merge(
        result,
        {key: value for key, value in schema.items() if key not in {"$ref", "allOf"}},
    )


def _select(schema: dict[str, Any], value: Any) -> dict[str, Any]:
    expanded = _expand(schema)
    variants = expanded.get("oneOf")
    if not isinstance(variants, list) or not isinstance(value, dict):
        return expanded
    for variant in variants:
        if not isinstance(variant, dict):
            continue
        candidate = _expand(variant)
        properties = candidate.get("properties", {})
        discriminators = {
            key: property_schema["const"]
            for key, property_schema in properties.items()
            if isinstance(property_schema, dict) and "const" in property_schema
        }
        if discriminators and all(
            value.get(key) == expected for key, expected in discriminators.items()
        ):
            return _merge(expanded, candidate)
    return expanded


def _active(
    parent: dict[str, Any], properties: dict[str, Any], schema: dict[str, Any]
) -> bool:
    condition = schema.get("x-activeWhen")
    if not isinstance(condition, dict):
        return True
    property_name = condition.get("property")
    if not isinstance(property_name, str):
        return True
    if property_name in parent:
        actual = parent[property_name]
    else:
        sibling = properties.get(property_name, {})
        actual = _expand(sibling).get("default") if isinstance(sibling, dict) else None
    return actual == condition.get("equals")


def _compact(value: Any, schema: dict[str, Any]) -> None:
    schema = _select(schema, value)
    if isinstance(value, list):
        item_schema = schema.get("items", {})
        if isinstance(item_schema, dict):
            for item in value:
                _compact(item, item_schema)
        return
    if not isinstance(value, dict):
        return

    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    for key in list(value):
        property_schema = properties.get(key)
        if not isinstance(property_schema, dict):
            continue
        property_schema = _expand(property_schema)
        if property_schema.get("x-wire") is False:
            value.pop(key)
            continue
        if not _active(value, properties, property_schema):
            value.pop(key)
            continue
        _compact(value[key], property_schema)
        if (
            key not in required
            and property_schema.get("x-wireDefault", True)
            and "default" in property_schema
            and value.get(key) == property_schema["default"]
        ):
            value.pop(key)
        elif key not in required and value.get(key) == {}:
            value.pop(key)
