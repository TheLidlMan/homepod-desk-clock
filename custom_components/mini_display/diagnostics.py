"""Diagnostics for a configured Mini-Display."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_API_TOKEN, DOMAIN

TO_REDACT = {CONF_API_TOKEN, "ssid", "bssid", "mac"}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    """Return transport, certificate and runtime state without credentials."""
    runtime = hass.data[DOMAIN][entry.entry_id]
    coordinator = runtime["coordinator"]
    return {
        "config": async_redact_data(dict(entry.data), TO_REDACT),
        "device": asdict(coordinator.device_info)
        if coordinator.device_info
        else None,
        "status": async_redact_data(dict(coordinator.data), TO_REDACT),
        "active_transport": (
            "https" if coordinator.client.active_use_ssl else "http"
        )
        if coordinator.client.active_use_ssl is not None
        else None,
    }
