"""Dashboard persistence and Home Assistant state forwarding."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from copy import deepcopy
from datetime import datetime
import logging
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.storage import Store

from .api import MiniDisplayApiError, MiniDisplayClient
from .assets import ASSET_ID_PATTERN, MiniDisplayAssetManager
from .const import DEFAULT_DATA_BATCH_INTERVAL_SECONDS
from .graphs import validate_graphs
from .history_data import HistoryData
from .schema_compactor import compact_with_schema
from .value_transform import validate_number_transform
from .weather import WeatherData, validate_weather, validate_weather_budget, weather_cards

STORE_VERSION = 1
STORE_KEY_PREFIX = "mini_display.scenes"
LEGACY_STORE_KEY_PREFIX = "mini_display.dashboard"
SCENE_DOCUMENT_VERSION = 1
DEFAULT_SCENE_ID = "default"
DEFAULT_SCENE_NAME = "Default"
VISIBILITY_OPERATORS = {
    "range",
    "number_equals",
    "number_not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "equals",
    "not_equals",
    "starts_with",
    "ends_with",
    "contains",
    "available",
    "unavailable",
}
NUMERIC_VISIBILITY_OPERATORS = {
    "number_equals",
    "number_not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
}
MAX_VISIBILITY_RULES = 12
MAX_VISIBILITY_DEPTH = 5
MAX_VISIBILITY_NODES = 48
MAX_VALUE_MAPPINGS = 12
COLOR_TOKENS = {
    "background", "surface", "primary", "secondary", "accent",
    "success", "warning", "error", "muted",
}
PREVIEW_TIMEOUT_SECONDS = 300
TRANSITION_TYPES = {
    "none", "random", "slide", "bounce", "fade", "wipe", "dissolve",
    "curtain", "blinds", "mosaic", "cascade", "spiral"
}
TRANSITION_DIRECTIONS = {"left", "right", "up", "down", "random"}
TRANSITION_SPEEDS = {"slow", "normal", "fast"}
HARDWARE_SCROLL_TRANSITIONS = {"slide", "bounce"}

_LOGGER = logging.getLogger(__name__)


class DashboardValidationError(ValueError):
    """A dashboard violates the version 1 structural contract."""

    def __init__(self, message: str, path: str = "/") -> None:
        super().__init__(message)
        self.path = path


def validate_dashboard(document: Any) -> dict[str, Any]:
    """Validate bounded structure before firmware performs final validation."""
    if not isinstance(document, dict):
        raise DashboardValidationError("Dashboard must be an object")
    if document.get("version") != 1:
        raise DashboardValidationError("Only schema version 1 is supported", "/version")
    document = deepcopy(document)
    legacy_transition = document.pop("transition", None)
    _validate_transition(legacy_transition, "/transition")
    pages = document.get("pages")
    if not isinstance(pages, list) or not 1 <= len(pages) <= 16:
        raise DashboardValidationError("Dashboard requires 1-16 pages", "/pages")
    seen_pages: set[str] = set()
    enabled_pages = 0
    for page_index, page in enumerate(pages):
        page_path = f"/pages/{page_index}"
        if not isinstance(page, dict):
            raise DashboardValidationError("Page must be an object", page_path)
        page_id = page.get("id")
        if not isinstance(page_id, str) or not page_id or len(page_id) > 32:
            raise DashboardValidationError("Page id must contain 1-32 characters", f"{page_path}/id")
        if page_id in seen_pages:
            raise DashboardValidationError("Page id must be unique", f"{page_path}/id")
        seen_pages.add(page_id)
        enabled = page.get("enabled", True)
        if not isinstance(enabled, bool):
            raise DashboardValidationError("enabled must be a boolean", f"{page_path}/enabled")
        if page.get("titlePosition", "top") not in {"top", "right", "bottom", "left"}:
            raise DashboardValidationError(
                "Unsupported page title position", f"{page_path}/titlePosition"
            )
        if enabled:
            enabled_pages += 1
        _validate_visibility(
            page.get("visibility"), f"{page_path}/visibility", allow_card_value=False
        )
        if "transition" not in page and legacy_transition is not None:
            page["transition"] = deepcopy(legacy_transition)
        _validate_transition(page.get("transition"), f"{page_path}/transition")
        _validate_asset_id(page.get("backgroundImage"), f"{page_path}/backgroundImage")
        if not isinstance(page.get("transparentCards", False), bool):
            raise DashboardValidationError(
                "transparentCards must be a boolean", f"{page_path}/transparentCards"
            )
        duration = page.get("durationSeconds")
        if duration is not None and (not isinstance(duration, int) or not 1 <= duration <= 86400):
            raise DashboardValidationError("durationSeconds must be 1-86400", f"{page_path}/durationSeconds")
        rows = page.get("rows")
        if not isinstance(rows, list) or not 1 <= len(rows) <= 6:
            raise DashboardValidationError("Page requires 1-6 rows", f"{page_path}/rows")
        for row_index, row in enumerate(rows):
            row_path = f"{page_path}/rows/{row_index}"
            if not isinstance(row, dict):
                raise DashboardValidationError("Row must be an object", row_path)
            _validate_visibility(
                row.get("visibility"), f"{row_path}/visibility", allow_card_value=False
            )
            cards = row.get("cards")
            free = page.get("layout") == "free"
            if not isinstance(cards, list) or not (0 if free else 1) <= len(cards) <= (18 if free else 3):
                raise DashboardValidationError("Row requires 1-3 cards", f"{row_path}/cards")
            for card_index, card in enumerate(cards):
                card_path = f"{row_path}/cards/{card_index}"
                if not isinstance(card, dict):
                    raise DashboardValidationError("Card must be an object", card_path)
                if card.get("type") not in {"clock", "number", "status", "text", "image", "chart", "weather"}:
                    raise DashboardValidationError("Unsupported card type", f"{card_path}/type")
                source = card.get("source")
                for style_key in ("style", "valueStyle", "titleStyle"):
                    style = card.get(style_key) or {}
                    if not isinstance(style, dict) or style.get("textFlow", "default") not in ("default", "overflow", "wrap"):
                        raise DashboardValidationError("Invalid text flow", f"{card_path}/{style_key}/textFlow")
                    if "marquee" in style and not isinstance(style["marquee"], bool):
                        raise DashboardValidationError("Invalid marquee toggle", f"{card_path}/{style_key}/marquee")
                    interval = style.get("marqueeIntervalMs", 100)
                    step = style.get("marqueeStepPixels", 1)
                    if style.get("marqueeEffect", "bounce") not in ("bounce", "loop"):
                        raise DashboardValidationError("Invalid marquee effect", f"{card_path}/{style_key}/marqueeEffect")
                    if type(interval) is not int or not 50 <= interval <= 10000:
                        raise DashboardValidationError("Marquee interval must be 50-10000 ms", f"{card_path}/{style_key}/marqueeIntervalMs")
                    if type(step) is not int or not 1 <= step <= 16:
                        raise DashboardValidationError("Marquee step must be 1-16 pixels", f"{card_path}/{style_key}/marqueeStepPixels")
                if card.get("type") == "weather":
                    validate_weather(card, card_path, DashboardValidationError)
                if source is not None and (not isinstance(source, str) or len(source) > 64):
                    raise DashboardValidationError("Invalid source", f"{card_path}/source")
                if card.get("type") in {"number", "status"} and not source:
                    raise DashboardValidationError("Card type requires source", f"{card_path}/source")
                if card.get("type") == "text" and not source and "text" not in card:
                    raise DashboardValidationError("Text card requires source or text", card_path)
                _validate_asset_id(card.get("backgroundImage"), f"{card_path}/backgroundImage")
                _validate_asset_id(card.get("image"), f"{card_path}/image")
                if card.get("type") == "image" and not card.get("image"):
                    raise DashboardValidationError("Image card requires an image", f"{card_path}/image")
                if card.get("imageFit", "cover") not in {"cover", "contain", "stretch"}:
                    raise DashboardValidationError("Unsupported image fit", f"{card_path}/imageFit")
                if not isinstance(card.get("transparentBackground", False), bool):
                    raise DashboardValidationError(
                        "transparentBackground must be a boolean",
                        f"{card_path}/transparentBackground",
                    )
                if card.get("backgroundMode", "color") not in {
                    "color", "transparent", "image"
                }:
                    raise DashboardValidationError(
                        "Unsupported background mode", f"{card_path}/backgroundMode"
                    )
                _validate_visibility(
                    card.get("visibility"),
                    f"{card_path}/visibility",
                    allow_card_value=bool(source)
                    or (card.get("type") == "text" and "text" in card),
                )
                if card.get("type") == "number" and card.get("progress", "none") != "none":
                    if "minimum" not in card or "maximum" not in card:
                        raise DashboardValidationError(
                            "Progress requires minimum and maximum", card_path
                        )
                validate_number_transform(
                    card.get("valueTransform"),
                    card.get("type"),
                    f"{card_path}/valueTransform",
                    DashboardValidationError,
                )
                _validate_value_mappings(
                    card.get("valueMappings"), card.get("type"), f"{card_path}/valueMappings"
                )
                _validate_color_mappings(
                    card.get("colorMappings"), card.get("type"), f"{card_path}/colorMappings"
                )
    if enabled_pages == 0:
        raise DashboardValidationError("Dashboard requires an enabled page", "/pages")
    validate_graphs(document, DashboardValidationError)
    validate_weather_budget(document, DashboardValidationError)
    return document


def _validate_asset_id(asset_id: Any, path: str) -> None:
    """Validate an optional content-addressed image id."""
    if asset_id is not None and (
        not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id)
    ):
        raise DashboardValidationError("Invalid image asset id", path)


def extract_assets(document: dict[str, Any]) -> set[str]:
    """Return all image ids referenced by a dashboard."""
    assets: set[str] = set()
    for page in document["pages"]:
        if isinstance(page.get("backgroundImage"), str):
            assets.add(page["backgroundImage"])
        for row in page["rows"]:
            for card in row["cards"]:
                if card.get("type") == "image" and isinstance(card.get("image"), str):
                    assets.add(card["image"])
                background_mode = card.get("backgroundMode")
                if (
                    isinstance(card.get("backgroundImage"), str)
                    and (background_mode == "image" or background_mode is None)
                ):
                    assets.add(card["backgroundImage"])
    return assets


def _validate_transition(transition: Any, path: str) -> None:
    """Validate optional page transition settings."""
    if transition is None:
        return
    if not isinstance(transition, dict):
        raise DashboardValidationError("Transition must be an object", path)
    transition_type = transition.get("type", "none")
    if transition_type == "doors":
        transition_type = "cascade"
        transition["type"] = transition_type
    if transition_type not in TRANSITION_TYPES:
        raise DashboardValidationError("Unsupported transition type", f"{path}/type")
    direction = transition.get("direction")
    if direction is not None and direction not in TRANSITION_DIRECTIONS:
        raise DashboardValidationError("Unsupported transition direction", f"{path}/direction")
    if transition_type in HARDWARE_SCROLL_TRANSITIONS and direction in {"left", "right"}:
        transition["direction"] = "up" if direction == "left" else "down"
    speed = transition.get("speed")
    if speed is not None and speed not in TRANSITION_SPEEDS:
        raise DashboardValidationError("Unsupported transition speed", f"{path}/speed")
    intensity = transition.get("intensity")
    if intensity is not None and intensity not in {"subtle", "strong"}:
        raise DashboardValidationError("Unsupported transition intensity", f"{path}/intensity")
    tile_size = transition.get("tileSize")
    if tile_size is not None and tile_size not in {"small", "medium", "large"}:
        raise DashboardValidationError("Unsupported transition tile size", f"{path}/tileSize")


def _validate_value_mappings(mappings: Any, card_type: Any, path: str) -> None:
    """Validate optional ordered display-value mappings."""
    if mappings is None:
        return
    if card_type not in {"number", "text"}:
        raise DashboardValidationError(
            "Value mappings are supported only for number and text cards", path
        )
    if not isinstance(mappings, list) or not 1 <= len(mappings) <= MAX_VALUE_MAPPINGS:
        raise DashboardValidationError(
            f"Value mappings require 1-{MAX_VALUE_MAPPINGS} rules", path
        )
    for index, mapping in enumerate(mappings):
        mapping_path = f"{path}/{index}"
        if not isinstance(mapping, dict):
            raise DashboardValidationError("Mapping must be an object", mapping_path)
        result = mapping.get("value")
        if not isinstance(result, str) or not result or len(result) > 48:
            raise DashboardValidationError(
                "Mapping result must contain 1-48 characters", f"{mapping_path}/value"
            )
        if card_type == "number":
            minimum = mapping.get("minimum")
            maximum = mapping.get("maximum")
            if minimum is None and maximum is None:
                raise DashboardValidationError(
                    "Number mapping requires a minimum or maximum", mapping_path
                )
            if minimum is not None and not isinstance(minimum, (int, float)):
                raise DashboardValidationError("Minimum must be a number", mapping_path)
            if maximum is not None and not isinstance(maximum, (int, float)):
                raise DashboardValidationError("Maximum must be a number", mapping_path)
            if minimum is not None and maximum is not None and minimum > maximum:
                raise DashboardValidationError(
                    "Minimum cannot exceed maximum", mapping_path
                )
            continue
        operator = mapping.get("operator")
        if operator not in {"equals", "starts_with", "ends_with", "contains"}:
            raise DashboardValidationError(
                "Unsupported text mapping operator", f"{mapping_path}/operator"
            )
        match = mapping.get("match")
        if not isinstance(match, str) or not match or len(match) > 64:
            raise DashboardValidationError(
                "Text mapping match must contain 1-64 characters",
                f"{mapping_path}/match",
            )


def _validate_color_mappings(mappings: Any, card_type: Any, path: str) -> None:
    """Validate optional ordered color mappings."""
    if mappings is None:
        return
    if card_type not in {"number", "text"}:
        raise DashboardValidationError(
            "Color mappings are supported only for number and text cards", path
        )
    if not isinstance(mappings, list) or not 1 <= len(mappings) <= MAX_VALUE_MAPPINGS:
        raise DashboardValidationError(
            f"Color mappings require 1-{MAX_VALUE_MAPPINGS} rules", path
        )
    for index, mapping in enumerate(mappings):
        mapping_path = f"{path}/{index}"
        if not isinstance(mapping, dict):
            raise DashboardValidationError("Mapping must be an object", mapping_path)
        if not mapping.get("background") and not mapping.get("foreground"):
            raise DashboardValidationError(
                "Color mapping requires a background or text color", mapping_path
            )
        for field in ("background", "foreground"):
            color = mapping.get(field)
            if color is not None and not _is_color(color):
                raise DashboardValidationError(
                    "Color must be a palette value or #RRGGBB", f"{mapping_path}/{field}"
                )
        if card_type == "number":
            minimum = mapping.get("minimum")
            maximum = mapping.get("maximum")
            if minimum is None and maximum is None:
                raise DashboardValidationError(
                    "Number color mapping requires a minimum or maximum", mapping_path
                )
            if minimum is not None and not isinstance(minimum, (int, float)):
                raise DashboardValidationError("Minimum must be a number", mapping_path)
            if maximum is not None and not isinstance(maximum, (int, float)):
                raise DashboardValidationError("Maximum must be a number", mapping_path)
            if minimum is not None and maximum is not None and minimum > maximum:
                raise DashboardValidationError(
                    "Minimum cannot exceed maximum", mapping_path
                )
            continue
        operator = mapping.get("operator")
        if operator not in {"equals", "starts_with", "ends_with", "contains"}:
            raise DashboardValidationError(
                "Unsupported text mapping operator", f"{mapping_path}/operator"
            )
        match = mapping.get("match")
        if not isinstance(match, str) or not match or len(match) > 64:
            raise DashboardValidationError(
                "Text color mapping match must contain 1-64 characters",
                f"{mapping_path}/match",
            )


def _is_color(value: Any) -> bool:
    """Return whether a color is a supported token or RGB literal."""
    return isinstance(value, str) and (
        value in COLOR_TOKENS
        or (
            len(value) == 7
            and value.startswith("#")
            and all(character in "0123456789abcdefABCDEF" for character in value[1:])
        )
    )


def _validate_visibility(
    visibility: Any, path: str, *, allow_card_value: bool
) -> None:
    """Validate named visibility rules and their bounded logic tree."""
    if visibility is None:
        return
    if not isinstance(visibility, dict):
        raise DashboardValidationError("Visibility must be an object", path)
    rules = visibility.get("rules")
    if not isinstance(rules, list) or not 1 <= len(rules) <= MAX_VISIBILITY_RULES:
        raise DashboardValidationError(
            f"Visibility requires 1-{MAX_VISIBILITY_RULES} rules", f"{path}/rules"
        )
    rule_ids: set[str] = set()
    for index, rule in enumerate(rules):
        rule_path = f"{path}/rules/{index}"
        if not isinstance(rule, dict):
            raise DashboardValidationError("Visibility rule must be an object", rule_path)
        rule_id = rule.get("id")
        if not isinstance(rule_id, str) or not rule_id or len(rule_id) > 32:
            raise DashboardValidationError("Rule requires a valid id", f"{rule_path}/id")
        if rule_id in rule_ids:
            raise DashboardValidationError("Rule ids must be unique", f"{rule_path}/id")
        rule_ids.add(rule_id)
        source = rule.get("source")
        if source not in {"card", "entity"}:
            raise DashboardValidationError("Unsupported rule source", f"{rule_path}/source")
        if source == "card" and not allow_card_value:
            raise DashboardValidationError("Card value is unavailable here", f"{rule_path}/source")
        if source == "entity":
            entity_id = rule.get("entity")
            if not isinstance(entity_id, str) or not entity_id or len(entity_id) > 64:
                raise DashboardValidationError("Rule requires an entity", f"{rule_path}/entity")
        operator = rule.get("operator")
        if operator not in VISIBILITY_OPERATORS:
            raise DashboardValidationError("Unsupported rule operator", f"{rule_path}/operator")
        if operator == "range":
            minimum = rule.get("minimum")
            maximum = rule.get("maximum")
            if minimum is None and maximum is None:
                raise DashboardValidationError("Range requires a limit", rule_path)
            if minimum is not None and not isinstance(minimum, (int, float)):
                raise DashboardValidationError("Minimum must be a number", f"{rule_path}/minimum")
            if maximum is not None and not isinstance(maximum, (int, float)):
                raise DashboardValidationError("Maximum must be a number", f"{rule_path}/maximum")
            if minimum is not None and maximum is not None and minimum > maximum:
                raise DashboardValidationError("Minimum cannot exceed maximum", rule_path)
        elif operator in NUMERIC_VISIBILITY_OPERATORS:
            value = rule.get("value")
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise DashboardValidationError(
                    "Comparison value must be a number", f"{rule_path}/value"
                )
        elif operator not in {"available", "unavailable"}:
            match = rule.get("match")
            if not isinstance(match, str) or not match or len(match) > 64:
                raise DashboardValidationError("Rule requires a match value", f"{rule_path}/match")

    node_count = [0]

    def validate_expression(expression: Any, expression_path: str, depth: int) -> None:
        if depth > MAX_VISIBILITY_DEPTH:
            raise DashboardValidationError("Visibility logic is nested too deeply", expression_path)
        node_count[0] += 1
        if node_count[0] > MAX_VISIBILITY_NODES:
            raise DashboardValidationError("Visibility logic has too many items", expression_path)
        if not isinstance(expression, dict):
            raise DashboardValidationError("Logic item must be an object", expression_path)
        expression_type = expression.get("type")
        negate = expression.get("negate")
        if negate is not None and not isinstance(negate, bool):
            raise DashboardValidationError("Negate must be a boolean", f"{expression_path}/negate")
        if expression_type == "rule":
            if expression.get("ruleId") not in rule_ids:
                raise DashboardValidationError("Logic references an unknown rule", f"{expression_path}/ruleId")
            return
        if expression_type != "group":
            raise DashboardValidationError("Unsupported logic item", f"{expression_path}/type")
        if expression.get("operator") not in {"and", "or"}:
            raise DashboardValidationError("Group operator must be and or or", f"{expression_path}/operator")
        children = expression.get("children")
        if not isinstance(children, list) or not 1 <= len(children) <= MAX_VISIBILITY_NODES:
            raise DashboardValidationError("Logic group cannot be empty", f"{expression_path}/children")
        for index, child in enumerate(children):
            validate_expression(child, f"{expression_path}/children/{index}", depth + 1)

    expression = visibility.get("expression")
    if not isinstance(expression, dict) or expression.get("type") != "group":
        raise DashboardValidationError("Visibility requires a root logic group", f"{path}/expression")
    validate_expression(expression, f"{path}/expression", 1)


def extract_sources(document: dict[str, Any]) -> set[str]:
    """Return all entity IDs referenced by cards and visibility rules."""
    sources = {
        card["source"]
        for page in document["pages"]
        if page.get("enabled", True)
        for row in page["rows"]
        for card in row["cards"]
        if isinstance(card.get("source"), str) and card["source"]
    }
    for page in document["pages"]:
        if not page.get("enabled", True):
            continue
        sources.update(_visibility_sources(page.get("visibility")))
        for row in page["rows"]:
            sources.update(_visibility_sources(row.get("visibility")))
            for card in row["cards"]:
                sources.update(
                    _visibility_sources(card.get("visibility"), card.get("source"))
                )
                graph_source = (card.get("graph") or {}).get("source")
                if graph_source:
                    sources.add(graph_source)
    return sources


def extract_visibility_sources(document: dict[str, Any]) -> set[str]:
    """Return entity IDs that can change the rendered layout."""
    sources: set[str] = set()
    for page in document["pages"]:
        if not page.get("enabled", True):
            continue
        sources.update(_visibility_sources(page.get("visibility")))
        for row in page["rows"]:
            sources.update(_visibility_sources(row.get("visibility")))
            for card in row["cards"]:
                sources.update(
                    _visibility_sources(card.get("visibility"), card.get("source"))
                )
    return sources


def _visibility_sources(visibility: Any, card_source: Any = None) -> set[str]:
    if not isinstance(visibility, dict):
        return set()
    sources = {
        rule["entity"]
        for rule in visibility.get("rules", [])
        if isinstance(rule, dict)
        and rule.get("source") == "entity"
        and isinstance(rule.get("entity"), str)
        and rule["entity"]
    }
    if (
        isinstance(card_source, str)
        and card_source
        and any(
            isinstance(rule, dict) and rule.get("source") == "card"
            for rule in visibility.get("rules", [])
        )
    ):
        sources.add(card_source)
    return sources


def _rule_matches(
    hass: HomeAssistant, rule: dict[str, Any], card: dict[str, Any] | None
) -> bool:
    static_value: str | None = None
    if rule["source"] == "card":
        if card is None:
            return False
        source = card.get("source")
        if source:
            state = hass.states.get(source)
        elif card.get("type") == "text" and "text" in card:
            state = None
            static_value = str(card["text"])
        else:
            state = None
    else:
        state = hass.states.get(rule["entity"])
    available = static_value is not None or (
        state is not None and state.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE)
    )
    operator = rule["operator"]
    if operator == "available":
        return available
    if operator == "unavailable":
        return not available
    if not available:
        return False
    actual = static_value if static_value is not None else state.state
    if operator == "range" or operator in NUMERIC_VISIBILITY_OPERATORS:
        try:
            number = float(actual)
        except (TypeError, ValueError):
            return False
        if operator == "range":
            minimum = rule.get("minimum")
            maximum = rule.get("maximum")
            return ((minimum is None or number >= float(minimum))
                    and (maximum is None or number <= float(maximum)))
        expected_number = float(rule["value"])
        if operator == "number_equals":
            return number == expected_number
        if operator == "number_not_equals":
            return number != expected_number
        if operator == "greater_than":
            return number > expected_number
        if operator == "greater_than_or_equal":
            return number >= expected_number
        if operator == "less_than":
            return number < expected_number
        return number <= expected_number
    expected = str(rule.get("match", ""))
    if operator == "equals":
        return actual == expected
    if operator == "not_equals":
        return actual != expected
    if operator == "starts_with":
        return actual.startswith(expected)
    if operator == "ends_with":
        return actual.endswith(expected)
    return expected in actual


def visibility_matches(
    hass: HomeAssistant, visibility: Any, card: dict[str, Any] | None = None
) -> bool:
    """Evaluate a named visibility-rule expression against current HA states."""
    if not isinstance(visibility, dict):
        return True
    rules = {
        rule["id"]: rule
        for rule in visibility.get("rules", [])
        if isinstance(rule, dict) and isinstance(rule.get("id"), str)
    }

    def evaluate(expression: dict[str, Any]) -> bool:
        if expression["type"] == "rule":
            result = _rule_matches(hass, rules[expression["ruleId"]], card)
        else:
            values = [evaluate(child) for child in expression["children"]]
            result = all(values) if expression["operator"] == "and" else any(values)
        return not result if expression.get("negate", False) else result

    return evaluate(visibility["expression"])


def render_dashboard(document: dict[str, Any], hass: HomeAssistant) -> dict[str, Any]:
    """Resolve HA visibility rules into a firmware-compatible dashboard."""
    rendered = deepcopy(document)
    visible_pages = []
    for page in rendered["pages"]:
        visibility = page.pop("visibility", None)
        if page.get("enabled", True) and visibility_matches(hass, visibility):
            visible_pages.append(page)
    rendered["pages"] = visible_pages
    if not visible_pages:
        rendered["pages"] = [{
            "id": "no_visible_pages",
            "title": "",
            "showTitle": False,
            "durationSeconds": 10,
            "enabled": True,
            "rows": [{"cards": [{
                "type": "text",
                "text": "No visible pages",
                "style": {"foreground": "muted"},
            }]}],
        }]
    for page in rendered["pages"]:
        visible_rows = []
        for row in page["rows"]:
            if not visibility_matches(hass, row.pop("visibility", None)):
                continue
            visible_cards = []
            for card in row["cards"]:
                visibility = card.pop("visibility", None)
                if visibility_matches(hass, visibility, card):
                    visible_cards.append(card)
            if visible_cards:
                row["cards"] = visible_cards
                visible_rows.append(row)
        page["rows"] = visible_rows or ([{"cards": []}] if page.get("layout") == "free" else [
            {
                "cards": [
                    {
                        "type": "text",
                        "text": "No visible content",
                        "style": {"foreground": "muted"},
                    }
                ]
            }
        ])
    return rendered


def compact_dashboard_for_device(document: dict[str, Any]) -> dict[str, Any]:
    """Remove schema defaults without changing editable HA data."""
    return compact_with_schema(document)


def serialize_state(state: State | None) -> dict[str, Any]:
    """Serialize state without exposing arbitrary large attributes."""
    if state is None:
        return {"state": "unknown", "available": False, "lastChanged": None}
    return {
        "state": state.state,
        "available": state.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE),
        "lastChanged": state.last_changed.isoformat(),
    }


def default_dashboard() -> dict[str, Any]:
    """Return a valid starter dashboard."""
    return {
        "version": 1,
        "defaults": {"pageDurationSeconds": 10, "theme": "dark"},
        "pages": [
            {
                "id": "page_1",
                "title": "Page 1",
                "durationSeconds": 10,
                "enabled": True,
                "transition": {"type": "none"},
                "rows": [
                    {
                        "weight": 1,
                        "gap": "small",
                        "cards": [
                            {
                                "type": "clock",
                                "format": "24h",
                                "showDate": True,
                            }
                        ],
                    }
                ],
            }
        ],
    }


class MiniDisplayDashboardManager:
    """Own one display's scenes, active dashboard, and entity subscriptions."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry_id: str,
        client: MiniDisplayClient,
        data_batch_interval: float = DEFAULT_DATA_BATCH_INTERVAL_SECONDS,
    ) -> None:
        self.hass = hass
        self.entry_id = entry_id
        self.client = client
        self.assets = MiniDisplayAssetManager(hass, entry_id, client)
        self.weather = hass.data.setdefault("mini_display_weather_cache", WeatherData(hass))
        self.history = HistoryData(hass)
        self._configured_batch_interval = data_batch_interval
        self.scenes: dict[str, dict[str, Any]] = {}
        self.active_scene_id = DEFAULT_SCENE_ID
        self.default_scene_id = DEFAULT_SCENE_ID
        self.preview_scene_id: str | None = None
        self.preview_page_id: str | None = None
        self.preview_dashboard: dict[str, Any] | None = None
        self.preview_owner: object | None = None
        self._preview_lock = asyncio.Lock()
        self.sources: set[str] = set()
        self.visibility_sources: set[str] = set()
        self._store: Store[dict[str, Any]] = Store(
            hass, STORE_VERSION, f"{STORE_KEY_PREFIX}.{entry_id}"
        )
        self._legacy_store: Store[dict[str, Any]] = Store(
            hass, STORE_VERSION, f"{LEGACY_STORE_KEY_PREFIX}.{entry_id}"
        )
        self._unsubscribe_states: Callable[[], None] | None = None
        self._cancel_batch: Callable[[], None] | None = None
        self._cancel_preview: Callable[[], None] | None = None
        self._cancel_heartbeat: Callable[[], None] | None = None
        self._pending_sources: set[str] = set()
        self._flush_in_progress = False
        self._resync_in_progress = False
        self._last_rendered_dashboard: dict[str, Any] | None = None
        self.data_forwarding_enabled = True

    async def async_load(self) -> None:
        await self.assets.async_load()
        stored = await self._store.async_load()
        if stored is None:
            legacy = await self._legacy_store.async_load()
            self.scenes = {
                DEFAULT_SCENE_ID: {
                    "id": DEFAULT_SCENE_ID,
                    "name": DEFAULT_SCENE_NAME,
                    "dashboard": (
                        validate_dashboard(legacy)
                        if legacy is not None
                        else default_dashboard()
                    ),
                }
            }
            self.default_scene_id = DEFAULT_SCENE_ID
            await self._async_save()
        elif stored.get("sceneDocumentVersion") == SCENE_DOCUMENT_VERSION:
            self.data_forwarding_enabled = stored.get(
                "dataForwardingEnabled", True
            )
            raw_scenes = stored.get("scenes")
            if not isinstance(raw_scenes, list) or not raw_scenes:
                raise DashboardValidationError("Scene document requires scenes")
            self.scenes = {}
            for scene in raw_scenes:
                scene_id = scene.get("id")
                name = scene.get("name")
                if not isinstance(scene_id, str) or not scene_id:
                    raise DashboardValidationError("Scene requires an id")
                if not isinstance(name, str) or not name.strip():
                    raise DashboardValidationError("Scene requires a name")
                dashboard = scene.get("dashboard")
                self.scenes[scene_id] = {
                    "id": scene_id,
                    "name": name.strip(),
                    "dashboard": (
                        validate_dashboard(dashboard) if dashboard is not None else None
                    ),
                }
            default_scene_id = stored.get("defaultSceneId")
            self.default_scene_id = (
                default_scene_id
                if isinstance(default_scene_id, str)
                and default_scene_id in self.scenes
                else (
                    DEFAULT_SCENE_ID
                    if DEFAULT_SCENE_ID in self.scenes
                    else next(iter(self.scenes))
                )
            )
            active = stored.get("activeSceneId")
            self.active_scene_id = self._fallback_scene_id(
                active if isinstance(active, str) else None
            )
        else:
            raise DashboardValidationError("Unsupported scene document")
        self._replace_subscriptions()

    @property
    def dashboard(self) -> dict[str, Any]:
        """Return the active scene dashboard."""
        dashboard = self.scenes[self.active_scene_id]["dashboard"]
        if dashboard is None:
            raise DashboardValidationError("Active scene has no layout")
        return dashboard

    @property
    def scene_summaries(self) -> list[dict[str, Any]]:
        """Return scene metadata without dashboard documents."""
        return [
            {
                "id": scene["id"],
                "name": scene["name"],
                "configured": scene["dashboard"] is not None,
            }
            for scene in self.scenes.values()
        ]

    @property
    def configured_scene_summaries(self) -> list[dict[str, Any]]:
        """Return scenes which can be activated on this display."""
        return [scene for scene in self.scene_summaries if scene["configured"]]

    def _fallback_scene_id(self, preferred: str | None = None) -> str:
        """Choose a configured scene, preferring the requested and default scenes."""
        candidates = [preferred, self.default_scene_id, *self.scenes]
        for scene_id in candidates:
            if scene_id and self.scenes.get(scene_id, {}).get("dashboard") is not None:
                return scene_id
        raise DashboardValidationError("At least one scene must have a layout")

    def get_dashboard(self, scene_id: str) -> dict[str, Any] | None:
        """Return a scene dashboard when configured for this display."""
        scene = self.scenes.get(scene_id)
        return deepcopy(scene["dashboard"]) if scene else None

    def scene_name(self, scene_id: str | None = None) -> str | None:
        """Return a scene's display name."""
        scene = self.scenes.get(scene_id or self.active_scene_id)
        return scene["name"] if scene else None

    def asset_references(self, asset_id: str) -> list[str]:
        """Return scene names which reference an image asset."""
        return [
            scene["name"]
            for scene in self.scenes.values()
            if scene["dashboard"] is not None
            and asset_id in extract_assets(scene["dashboard"])
        ]

    async def async_create_scene(
        self, scene_id: str, name: str, dashboard: dict[str, Any] | None = None
    ) -> None:
        """Create a scene with no layout unless one is explicitly supplied."""
        if scene_id in self.scenes:
            return
        self.scenes[scene_id] = {
            "id": scene_id,
            "name": name,
            "dashboard": (
                validate_dashboard(deepcopy(dashboard))
                if dashboard is not None
                else None
            ),
        }
        await self._async_save()

    async def async_duplicate_scene(
        self, source_scene_id: str, scene_id: str, name: str
    ) -> None:
        """Duplicate one scene's layout for this display."""
        source = self.scenes.get(source_scene_id)
        if source is None:
            raise DashboardValidationError("Source scene not found")
        await self.async_create_scene(scene_id, name, source["dashboard"])

    async def async_set_default_scene(self, scene_id: str) -> None:
        """Set the scene used as the logical default."""
        if scene_id not in self.scenes:
            raise DashboardValidationError("Scene not found")
        self.default_scene_id = scene_id
        await self._async_save()

    async def async_rename_scene(self, scene_id: str, name: str) -> None:
        """Rename an existing scene."""
        if scene_id not in self.scenes:
            raise DashboardValidationError("Scene not found")
        self.scenes[scene_id]["name"] = name
        await self._async_save()

    async def async_delete_scene(self, scene_id: str) -> None:
        """Delete a scene and fall back to a configured scene when needed."""
        if scene_id == self.default_scene_id:
            raise DashboardValidationError("Default scene cannot be deleted")
        if scene_id not in self.scenes:
            return
        if self.scenes[scene_id]["dashboard"] is not None and not any(
            other_id != scene_id and scene["dashboard"] is not None
            for other_id, scene in self.scenes.items()
        ):
            raise DashboardValidationError("Last configured scene cannot be deleted")
        if self.preview_scene_id == scene_id:
            await self.async_stop_preview()
        was_active = self.active_scene_id == scene_id
        del self.scenes[scene_id]
        if was_active:
            self.active_scene_id = self._fallback_scene_id()
            await self._async_send_dashboard(self.dashboard)
            self._replace_subscriptions()
        await self._async_save()

    async def async_activate_scene(self, scene_id: str) -> None:
        """Activate and upload a scene to the physical display."""
        if scene_id not in self.scenes:
            raise DashboardValidationError("Scene not configured for this display")
        dashboard = self.scenes[scene_id]["dashboard"]
        if dashboard is None:
            raise DashboardValidationError("Scene has no layout for this display")
        await self._async_send_dashboard(dashboard)
        self._clear_preview()
        self.active_scene_id = scene_id
        await self._async_save()
        self._replace_subscriptions()

    async def async_start_preview(
        self,
        scene_id: str,
        page_id: str | None = None,
        dashboard: dict[str, Any] | None = None,
        owner: object | None = None,
        update: bool = False,
    ) -> None:
        async with self._preview_lock:
            if update and (self.preview_scene_id != scene_id or self.preview_owner is not owner):
                raise DashboardValidationError("Preview has ended; enable preview again")
            await self._async_start_preview(scene_id, page_id, dashboard, owner)

    async def _async_start_preview(
        self,
        scene_id: str,
        page_id: str | None = None,
        dashboard: dict[str, Any] | None = None,
        owner: object | None = None,
    ) -> None:
        """Temporarily show a scene without changing the active scene."""
        if scene_id not in self.scenes:
            raise DashboardValidationError("Scene not configured for this display")
        stored_dashboard = self.scenes[scene_id]["dashboard"]
        preview_dashboard = (
            validate_dashboard(dashboard)
            if dashboard is not None
            else stored_dashboard
        )
        if preview_dashboard is None:
            raise DashboardValidationError("Scene has no layout for this display")
        if page_id is not None and page_id not in {
            page["id"] for page in preview_dashboard["pages"]
        }:
            raise DashboardValidationError("Page not found in scene")
        if page_id is not None:
            preview_dashboard = deepcopy(preview_dashboard)
            preview_dashboard["pages"] = [page for page in preview_dashboard["pages"] if page["id"] == page_id]
            for page in preview_dashboard["pages"]:
                if page["id"] == page_id:
                    page["enabled"] = True
        # A page preview needs only that page, not every page, image and source
        # in its scene. A one-page dashboard renders immediately without a
        # second HTTP request to select the page.
        await self._async_send_dashboard(preview_dashboard, prune_assets=False)
        self._clear_preview()
        self.preview_scene_id = scene_id
        self.preview_page_id = page_id
        self.preview_dashboard = preview_dashboard
        self.preview_owner = owner
        self._cancel_preview = async_call_later(
            self.hass, PREVIEW_TIMEOUT_SECONDS, self._async_preview_expired
        )
        self._replace_subscriptions()

    async def async_stop_preview(self, owner: object | None = None) -> None:
        async with self._preview_lock:
            await self._async_stop_preview(owner)

    async def _async_stop_preview(self, owner: object | None = None) -> None:
        """Restore the active scene after a temporary preview."""
        if self.preview_scene_id is None or (
            owner is not None and owner is not self.preview_owner
        ):
            return
        await self._async_send_dashboard(self.dashboard)
        self._clear_preview()
        self._replace_subscriptions()

    def _clear_preview(self) -> None:
        if self._cancel_preview is not None:
            self._cancel_preview()
            self._cancel_preview = None
        self.preview_scene_id = None
        self.preview_page_id = None
        self.preview_dashboard = None
        self.preview_owner = None

    async def _async_preview_expired(self, _now: datetime) -> None:
        async with self._preview_lock:
            await self._async_expire_preview()

    async def _async_expire_preview(self) -> None:
        self._cancel_preview = None
        try:
            self._clear_preview()
            await self._async_send_dashboard(self.dashboard)
            self._replace_subscriptions()
        except Exception:
            _LOGGER.exception("Failed to restore active Mini Display scene")

    async def async_apply(
        self,
        document: dict[str, Any],
        active_page_id: str | None = None,
        scene_id: str | None = None,
    ) -> None:
        async with self._preview_lock:
            await self._async_apply(document, active_page_id, scene_id)

    async def _async_apply(
        self,
        document: dict[str, Any],
        active_page_id: str | None,
        scene_id: str | None,
    ) -> None:
        validated = validate_dashboard(document)
        target_scene_id = scene_id or self.active_scene_id
        scene = self.scenes.get(target_scene_id)
        if scene is None:
            raise DashboardValidationError("Scene not configured for this display")
        shown_scene_id = self.preview_scene_id or self.active_scene_id
        if target_scene_id == self.preview_scene_id:
            page_id = self.preview_page_id
            if page_id is not None and not any(page["id"] == page_id for page in validated["pages"]):
                page_id = validated["pages"][0]["id"]
            await self._async_start_preview(target_scene_id, page_id, validated, self.preview_owner)
        elif target_scene_id == shown_scene_id:
            await self._async_send_dashboard(validated, active_page_id)
        scene["dashboard"] = validated
        await self._async_save()
        if target_scene_id == shown_scene_id:
            self._replace_subscriptions()

    async def _async_send_dashboard(
        self,
        dashboard: dict[str, Any],
        active_page_id: str | None = None,
        *,
        prune_assets: bool = True,
    ) -> None:
        """Upload one dashboard and its current entity values."""
        rendered = render_dashboard(dashboard, self.hass)
        if active_page_id not in {page["id"] for page in rendered["pages"]}:
            active_page_id = None
        canonical_rendered = deepcopy(rendered)
        sources = extract_sources(rendered)
        values = {entity_id: serialize_state(self.hass.states.get(entity_id)) for entity_id in sources}
        values.update(await self.weather.values(rendered, compile_cards=True))
        if len(values) > 32:
            raise DashboardValidationError("Dashboard exceeds 32 display data sources")
        if values:
            await self.client.async_patch_values(values, render=False)
        required_assets = extract_assets(rendered)
        previous_assets = (
            extract_assets(self._last_rendered_dashboard)
            if self._last_rendered_dashboard is not None
            else set()
        )
        transaction = await self.assets.async_stage(required_assets, previous_assets)
        try:
            await self.client.async_put_dashboard(
                compact_dashboard_for_device(rendered), render=active_page_id is None
            )
        except Exception:
            await self.assets.async_rollback(transaction)
            raise
        if prune_assets:
            await self.assets.async_prune(required_assets, transaction.remote_ids)
        await self._async_send_history(rendered)
        self._last_rendered_dashboard = canonical_rendered
        if active_page_id is not None:
            await self.client.async_set_page(active_page_id)

    async def _async_save(self) -> None:
        """Persist all scenes for this display."""
        await self._store.async_save(
            {
                "sceneDocumentVersion": SCENE_DOCUMENT_VERSION,
                "activeSceneId": self.active_scene_id,
                "defaultSceneId": self.default_scene_id,
                "dataForwardingEnabled": self.data_forwarding_enabled,
                "scenes": list(self.scenes.values()),
            }
        )

    async def async_set_data_forwarding_enabled(self, enabled: bool) -> None:
        """Enable or pause periodic Home Assistant state forwarding."""
        if self.data_forwarding_enabled == enabled:
            return
        self.data_forwarding_enabled = enabled
        self._pending_sources.clear()
        if self._cancel_batch is not None:
            self._cancel_batch()
            self._cancel_batch = None
        self._replace_subscriptions()
        await self._async_save()
        if enabled:
            try:
                await self.async_send_snapshot()
            except MiniDisplayApiError:
                _LOGGER.debug(
                    "Mini-Display snapshot delayed; display unavailable"
                )

    async def async_send_snapshot(self) -> None:
        if not self.sources:
            return
        values = {
            entity_id: serialize_state(self.hass.states.get(entity_id))
            for entity_id in self.sources
        }
        values.update(await self.weather.values(self._shown_dashboard()))
        await self.client.async_patch_values(values)
        await self._async_send_history(self._last_rendered_dashboard)

    async def _async_send_history(self, dashboard) -> None:
        series = await self.history.series(dashboard)
        for index, item in enumerate(series):
            try:
                await self.client.async_patch_history(item, render=index == len(series) - 1)
            except MiniDisplayApiError:
                _LOGGER.debug("History update delayed; retrying at next heartbeat")
                break

    def _shown_dashboard(self) -> dict | None:
        return self.preview_dashboard if self.preview_scene_id is not None else self.scenes.get(self.active_scene_id, {}).get("dashboard")

    async def async_resynchronize(self) -> None:
        """Restore the complete dashboard state after a display restart."""
        if not self.data_forwarding_enabled or self._resync_in_progress:
            return
        self._resync_in_progress = True
        try:
            shown_dashboard = (
                self.preview_dashboard
                if self.preview_scene_id is not None
                else self.scenes[self.active_scene_id]["dashboard"]
            )
            if shown_dashboard is not None:
                await self._async_send_dashboard(
                    shown_dashboard,
                    self.preview_page_id,
                    prune_assets=self.preview_scene_id is None,
                )
        finally:
            self._resync_in_progress = False

    def _replace_subscriptions(self) -> None:
        if self._cancel_heartbeat is not None:
            self._cancel_heartbeat()
            self._cancel_heartbeat = None
        if self._unsubscribe_states is not None:
            self._unsubscribe_states()
            self._unsubscribe_states = None
        shown_dashboard = (
            self.preview_dashboard
            if self.preview_scene_id is not None
            else self.scenes[self.active_scene_id]["dashboard"]
        )
        self.sources = extract_sources(shown_dashboard) if shown_dashboard else set()
        self.visibility_sources = (
            extract_visibility_sources(shown_dashboard) if shown_dashboard else set()
        )
        if self.sources and self.data_forwarding_enabled:
            self._unsubscribe_states = async_track_state_change_event(
                self.hass, self.sources, self._state_changed
            )
            if shown_dashboard and any(card.get("graph") is not None or card.get("type") == "weather"
                for page in shown_dashboard["pages"] for row in page["rows"] for card in row["cards"]):
                self._cancel_heartbeat = async_call_later(self.hass, 60, self._graph_heartbeat)

    async def _graph_heartbeat(self, _now: datetime) -> None:
        self._cancel_heartbeat = None
        if not self.data_forwarding_enabled:
            return
        try:
            await self.async_send_snapshot()
        except MiniDisplayApiError:
            _LOGGER.debug("Graph heartbeat delayed; display unavailable")
        finally:
            if self.data_forwarding_enabled:
                self._cancel_heartbeat = async_call_later(self.hass, 60, self._graph_heartbeat)

    @callback
    def _state_changed(self, event: Event) -> None:
        entity_id = event.data["entity_id"]
        self._pending_sources.add(entity_id)
        if self._cancel_batch is None:
            self._cancel_batch = async_call_later(
                self.hass, self.data_batch_interval, self._flush_pending
            )

    @property
    def data_batch_interval(self) -> float:
        """Keep only the latest state per entity while the display is waiting."""
        return max(self._configured_batch_interval, self.client.data_limiter.interval)

    async def _flush_pending(self, _now: datetime) -> None:
        self._cancel_batch = None
        if self._flush_in_progress:
            return
        if self.client.data_limiter.delay > 0:
            self._cancel_batch = async_call_later(
                self.hass, self.client.data_limiter.delay, self._flush_pending
            )
            return
        self._flush_in_progress = True
        pending, self._pending_sources = self._pending_sources, set()
        values = {
            entity_id: serialize_state(self.hass.states.get(entity_id))
            for entity_id in pending
        }
        try:
            if any(card.get("source") in pending for card in weather_cards(self._shown_dashboard())):
                values.update(await self.weather.values(self._shown_dashboard()))
            if pending & self.visibility_sources:
                shown_dashboard = (
                    self.preview_dashboard
                    if self.preview_scene_id is not None
                    else self.scenes[self.active_scene_id]["dashboard"]
                )
                if shown_dashboard is not None:
                    rendered = render_dashboard(shown_dashboard, self.hass)
                    if rendered != self._last_rendered_dashboard:
                        await self._async_send_dashboard(
                            shown_dashboard, self.preview_page_id
                        )
                    elif values:
                        await self.client.async_patch_values(values)
            elif values:
                await self.client.async_patch_values(values)
        except MiniDisplayApiError:
            self._pending_sources.update(pending)
            _LOGGER.debug("Mini-Display data update delayed; display unavailable")
        finally:
            self._flush_in_progress = False
            if self._pending_sources and self._cancel_batch is None:
                self._cancel_batch = async_call_later(
                    self.hass, self.data_batch_interval, self._flush_pending
                )

    def close(self) -> None:
        self.data_forwarding_enabled = False
        if self._cancel_heartbeat is not None:
            self._cancel_heartbeat()
        if self._unsubscribe_states is not None:
            self._unsubscribe_states()
        if self._cancel_batch is not None:
            self._cancel_batch()
        if self._cancel_preview is not None:
            self._cancel_preview()
