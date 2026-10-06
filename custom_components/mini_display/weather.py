"""Weather selection and compact display snapshots, using Home Assistant data."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
import hashlib
import math
import re
import time
from typing import Any

from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

CONDITIONS = (
    "clear-night", "cloudy", "fog", "hail", "lightning", "lightning-rainy",
    "partlycloudy", "pouring", "rainy", "snowy", "snowy-rainy", "sunny",
    "windy", "windy-variant", "exceptional",
)
DEFAULT_FIELDS = ("icon", "condition", "temperature")
FIELDS = (*DEFAULT_FIELDS, "low", "label", "humidity", "precipitation", "wind")


def validate_weather_budget(document: dict, error: type[ValueError]) -> None:
    """Weather has multiple text runs per card; respect the firmware cache."""
    for index, page in enumerate(document["pages"]):
        cards = [card for row in page["rows"] for card in row["cards"]]
        if not any(card.get("type") == "weather" for card in cards):
            continue
        # Reserve one page heading and one per row, including currently hidden ones.
        runs = 1 + len(page["rows"])
        for card in cards:
            if card.get("type") == "weather":
                settings = card.get("weather", {})
                runs += 1 + settings.get("count", 1) * len(settings.get("fields", DEFAULT_FIELDS))
            else:
                runs += 2
        if runs > 43:
            raise error("Too many weather details on one page; use fewer fields or forecasts", f"/pages/{index}")


def weather_cards(dashboard: dict | None):
    if dashboard:
        for page in dashboard["pages"]:
            if page.get("enabled", True):
                for row in page["rows"]:
                    for card in row["cards"]:
                        if card.get("type") == "weather":
                            yield card


def validate_weather(card: dict, path: str, error: type[ValueError]) -> None:
    if (not isinstance(card.get("source"), str) or len(card["source"]) > 64
            or not re.fullmatch(r"weather\.[a-z0-9_]+", card["source"])):
        raise error("Choose a Home Assistant weather entity", f"{path}/source")
    settings = card.get("weather", {})
    if not isinstance(settings, dict):
        raise error("Invalid weather settings", f"{path}/weather")
    for key, choices, default in (
        ("period", ("current", "daily", "hourly", "twice_daily"), "current"),
        ("layout", ("vertical", "horizontal", "compact"), "vertical"),
        ("iconStyle", ("color", "mono"), "color"),
        ("language", ("en", "pl"), "en"),
    ):
        if settings.get(key, default) not in choices:
            raise error(f"Unsupported weather {key}", f"{path}/weather/{key}")
    for key, low, high, default in (("offset", 0, 14, 0), ("count", 1, 5, 1), ("step", 1, 24, 1)):
        value = settings.get(key, default)
        if type(value) is not int or not low <= value <= high:
            raise error(f"{key} must be {low}-{high}", f"{path}/weather/{key}")
    fields = settings.get("fields", list(DEFAULT_FIELDS))
    if not isinstance(fields, list) or not fields or any(x not in FIELDS for x in fields) or len(set(fields)) != len(fields):
        raise error("Choose the weather details to display", f"{path}/weather/fields")
    if settings.get("period", "current") == "current" and (settings.get("count", 1) != 1 or settings.get("offset", 0) != 0):
        raise error("Current weather has one reading", f"{path}/weather")


def weather_source(card: dict, index: int) -> str:
    settings = card.get("weather", {})
    offset = settings.get("offset", 0) + index * settings.get("step", 1)
    identity = f'{card["source"]}:{settings.get("period", "current")}:{offset}:{settings.get("language", "en")}'
    return "weather_" + hashlib.sha256(identity.encode()).hexdigest()[:20]


def select_forecast(forecasts: list[dict], period: str, offset: int, now: datetime) -> dict | None:
    """Select by local calendar day, not provider-dependent array indices."""
    parsed = []
    for item in forecasts:
        stamp = dt_util.parse_datetime(str(item.get("datetime", "")))
        if stamp is not None:
            parsed.append((dt_util.as_local(stamp), item))
    parsed.sort(key=lambda pair: dt_util.as_utc(pair[0]))
    if period == "daily":
        target = now.date() + timedelta(days=offset)
        return next((item for stamp, item in parsed if stamp.date() == target), None)
    if period == "hourly":
        current_hour = dt_util.as_utc(now).replace(minute=0, second=0, microsecond=0)
        first = next((dt_util.as_utc(stamp) for stamp, _ in parsed
                      if dt_util.as_utc(stamp) >= current_hour), None)
        if first is None:
            return None
        target = first + timedelta(hours=offset)
        return next((item for stamp, item in parsed if dt_util.as_utc(stamp) == target), None)
    # A day/night forecast describes a period beginning at its timestamp.
    # Keep the current period, not the already finished morning of this day.
    current = dt_util.as_utc(now)
    remaining = [item for index, (stamp, item) in enumerate(parsed)
                 if dt_util.as_utc(stamp) + timedelta(hours=12) > current
                 and (index + 1 == len(parsed) or dt_util.as_utc(parsed[index + 1][0]) > current)]
    return remaining[offset] if offset < len(remaining) else None


def encode_weather(item: dict | None, label: str) -> dict:
    """Fit one selected forecast in the existing bounded 48-byte value slot."""
    if item is None:
        return {"state": "", "available": False}
    code = CONDITIONS.index(item["condition"]) if item.get("condition") in CONDITIONS else 15

    def number(name: str) -> str:
        value = item.get(name)
        if isinstance(value, bool):
            return ""
        try:
            value = float(value)
        except (ValueError, TypeError):
            return ""
        if not math.isfinite(value) or not -999 <= value <= 9999:
            return ""
        return f"{value:.1f}" if name in ("temperature", "templow", "wind_speed") else f"{value:.0f}"

    fields = [str(code), number("temperature"), number("templow"), number("humidity"),
              number("precipitation_probability"), number("wind_speed"), label[:8]]
    payload = "|".join(fields)
    if len(payload.encode()) > 48:
        return {"state": "", "available": False}
    return {"state": payload, "available": True}


class WeatherData:
    """Cache forecasts shared by all displays; bounded refresh and retry rate."""

    def __init__(self, hass):
        self.hass = hass
        self.cache: dict[tuple[str, str], tuple[float, list[dict]]] = {}
        self.lock = asyncio.Lock()

    async def forecast(self, entity_id: str, period: str) -> list[dict]:
        key = (entity_id, period)
        async with self.lock:
            now = time.monotonic()
            cached = self.cache.get(key)
            if cached and cached[0] > now:
                return cached[1]
            try:
                async with asyncio.timeout(15):
                    response = await self.hass.services.async_call(
                        "weather", "get_forecasts", {"entity_id": entity_id, "type": period},
                        blocking=True, return_response=True,
                    )
                items = (response or {}).get(entity_id, {}).get("forecast", [])
                items = [item for item in items[:168] if isinstance(item, dict)] if isinstance(items, list) else []
                self.cache[key] = (now + 900, items)
            except (HomeAssistantError, TimeoutError):
                # Do not present old cached forecasts as current after an error.
                self.cache[key] = (now + 60, [])
            result = self.cache[key][1]
            if len(self.cache) > 64:
                self.cache.pop(next(iter(self.cache)))
            return result

    async def values(self, dashboard: dict | None, *, compile_cards: bool = False) -> dict:
        values: dict[str, dict] = {}
        now = dt_util.now()
        for card in weather_cards(dashboard):
            settings = card.setdefault("weather", {}) if compile_cards else card.get("weather", {})
            state = self.hass.states.get(card["source"])
            available = state is not None and state.state not in ("unknown", "unavailable")
            attrs = state.attributes if state else {}
            period = settings.get("period", "current")
            forecasts = await self.forecast(card["source"], period) if available and period != "current" else []
            sources = []
            for index in range(settings.get("count", 1)):
                offset = settings.get("offset", 0) + index * settings.get("step", 1)
                item = dict(attrs, condition=state.state) if available and period == "current" else (
                    select_forecast(forecasts, period, offset, now) if available else None)
                if period == "current":
                    label = "Teraz" if settings.get("language") == "pl" else "Now"
                elif period == "daily":
                    label = (now + timedelta(days=offset)).strftime("%d.%m")
                else:
                    stamp = dt_util.parse_datetime(str(item.get("datetime", ""))) if item else None
                    label = dt_util.as_local(stamp).strftime("%H:%M") if stamp else "--"
                source = weather_source(card, index)
                sources.append(source)
                values[source] = encode_weather(item, label)
            if compile_cards:
                settings["sources"] = sources
                settings["temperatureUnit"] = str(attrs.get("temperature_unit", ""))[:6]
                settings["windUnit"] = str(attrs.get("wind_speed_unit", ""))[:8]
        return values
