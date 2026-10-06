"""Notification actions and per-device placement, independent of dashboards."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.components.select import SelectEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv, device_registry as dr

from .api import MiniDisplayApiError
from .const import DOMAIN
from .entity import MiniDisplayEntity

POSITIONS = ("top", "bottom", "left", "right", "top_left", "top_right", "bottom_left", "bottom_right")
SEVERITIES = ("info", "success", "warning", "error", "critical")
ICONS = ("auto", "none", "bell", "info", "check", "warning", "error", "power", "door")


def _text(maximum: int):
    def validate(value):
        if not isinstance(value, str):
            raise vol.Invalid("Expected text")
        try:
            size = len(value.encode("utf-8"))
        except UnicodeEncodeError as err:
            raise vol.Invalid("Expected valid UTF-8") from err
        if size > maximum or any((ord(c) < 32 and c != "\n") or ord(c) == 127 for c in value):
            raise vol.Invalid(f"Text must contain at most {maximum} UTF-8 bytes without control characters")
        return value
    return validate


def _content(data):
    if not data.get("title", "").strip() and not data.get("message", "").strip():
        raise vol.Invalid("Title or message is required")
    return data


def _duration(value):
    if type(value) is not int or not 1 <= value <= 300:
        raise vol.Invalid("Duration must be 1-300 whole seconds")
    return value


NOTIFY_SCHEMA = vol.All(vol.Schema({
    vol.Required("device_id"): cv.string,
    vol.Optional("title", default=""): _text(96),
    vol.Optional("message", default=""): _text(384),
    vol.Optional("icon", default="auto"): vol.In(ICONS),
    vol.Optional("severity", default="info"): vol.In(SEVERITIES),
    vol.Optional("duration", default=8): _duration,
    vol.Optional("position"): vol.In(POSITIONS),
}), _content)


@callback
def async_register_notification_services(hass: HomeAssistant) -> None:
    """Keep actions registered even when a display cannot finish setup."""
    def coordinator_for(call: ServiceCall):
        device = dr.async_get(hass).async_get(call.data["device_id"])
        if device:
            for entry_id in sorted(device.config_entries):
                runtime = hass.data.get(DOMAIN, {}).get(entry_id)
                if isinstance(runtime, dict) and "coordinator" in runtime:
                    coordinator = runtime["coordinator"]
                    if "notificationPositions" not in (coordinator.data or {}):
                        raise ServiceValidationError("This display firmware does not support notifications")
                    return coordinator
        raise ServiceValidationError("The selected Mini-Display is not loaded")

    async def notify(call: ServiceCall) -> None:
        coordinator = coordinator_for(call)
        data = call.data
        payload = {key: data[key] for key in ("title", "message", "icon", "severity")}
        payload["durationSeconds"] = data["duration"]
        if "position" in data:
            if data["position"] not in coordinator.data["notificationPositions"]:
                raise ServiceValidationError("This position is not supported by the selected screen")
            payload["position"] = data["position"]
        try:
            await coordinator.client.async_notify(payload)
        except MiniDisplayApiError as err:
            raise HomeAssistantError(str(err)) from err

    async def dismiss(call: ServiceCall) -> None:
        coordinator = coordinator_for(call)
        try:
            await coordinator.client.async_dismiss_notifications()
        except MiniDisplayApiError as err:
            raise HomeAssistantError(str(err)) from err

    hass.services.async_register(DOMAIN, "notify", notify, schema=NOTIFY_SCHEMA)
    hass.services.async_register(DOMAIN, "dismiss_notifications", dismiss,
                                 schema=vol.Schema({vol.Required("device_id"): cv.string}))


class MiniDisplayNotificationPositionSelect(MiniDisplayEntity, SelectEntity):
    """Use only positions advertised by this physical display."""

    _attr_translation_key = "notification_position"
    _attr_icon = "mdi:message-badge-outline"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "notification_position")

    @property
    def available(self) -> bool:
        return super().available and bool(self.options)

    @property
    def options(self) -> list[str]:
        return [position for position in self.coordinator.data.get("notificationPositions", []) if position in POSITIONS]

    @property
    def current_option(self) -> str | None:
        return self.coordinator.data.get("notificationPosition")

    async def async_select_option(self, option: str) -> None:
        if option not in self.options:
            raise ServiceValidationError("Unsupported notification position")
        await self.coordinator.client.async_set_display(notification_position=option)
        await self.coordinator.async_request_refresh()
