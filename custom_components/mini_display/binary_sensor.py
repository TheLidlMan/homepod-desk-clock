"""Connectivity sensor."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.const import EntityCategory

from .entity import MiniDisplayEntity


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    coordinator = hass.data["mini_display"][entry.entry_id]["coordinator"]
    async_add_entities(
        [
            MiniDisplayConnectivity(coordinator),
            *(
                MiniDisplayDiagnosticBinarySensor(coordinator, *definition)
                for definition in BINARY_SENSORS
            ),
        ]
    )


BINARY_SENSORS = (
    ("time_synchronized", "Time synchronized", "timeSynchronized"),
    ("filesystem_ready", "Filesystem ready", "filesystemReady"),
    ("mdns_ready", "mDNS ready", "mdnsReady"),
    ("setup_mode", "Setup Mode active", "setupMode"),
    ("panel_api_protection", "Panel and API protection", "apiAuthEnabled"),
    ("panel_api_password", "Panel and API password configured", "apiPasswordSet"),
    ("direct_ota", "Direct OTA enabled", "directOtaEnabled"),
    ("ota_protection", "OTA protection", "otaAuthEnabled"),
    ("ota_password", "OTA password configured", "otaPasswordSet"),
    ("https_enabled", "HTTPS preferred", "httpsEnabled"),
    ("https_available", "HTTPS available", "httpsAvailable"),
    (
        "recovery_wifi_password",
        "Setup Mode Wi-Fi password configured",
        "recoveryPasswordSet",
    ),
)


class MiniDisplayConnectivity(MiniDisplayEntity, BinarySensorEntity):
    _attr_name = "Connectivity"
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "connectivity")

    @property
    def is_on(self) -> bool:
        return self.coordinator.last_update_success


class MiniDisplayDiagnosticBinarySensor(MiniDisplayEntity, BinarySensorEntity):
    """Expose one boolean diagnostic reported by the display."""

    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator, key: str, name: str, status_key: str) -> None:
        super().__init__(coordinator, key)
        self._attr_name = name
        self._status_key = status_key

    @property
    def is_on(self) -> bool | None:
        value = self.coordinator.data.get(self._status_key)
        return bool(value) if value is not None else None
