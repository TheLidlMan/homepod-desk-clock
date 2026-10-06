"""Diagnostic and dashboard status sensors."""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory, PERCENTAGE, UnitOfInformation

from .const import TIMEZONE_OPTIONS
from .entity import MiniDisplayEntity

SENSORS = (
    ("current_page", "Current page", "page", None, None),
    ("ip_address", "IP address", "ip", None, None),
    ("hostname", "Hostname", "hostname", None, None),
    ("wifi_network", "Wi-Fi network", "ssid", None, None),
    ("ip_assignment", "IP assignment", "staticIpEnabled", None, None),
    ("wifi_signal", "Wi-Fi signal", "wifiRssiDbm", SensorDeviceClass.SIGNAL_STRENGTH, "dBm"),
    ("wifi_channel", "Wi-Fi channel", "wifiChannel", None, None),
    ("wifi_bssid", "Wi-Fi BSSID", "bssid", None, None),
    ("mac_address", "MAC address", "mac", None, None),
    ("gateway", "Gateway", "gateway", None, None),
    ("primary_dns", "Primary DNS", "dns1", None, None),
    ("secondary_dns", "Secondary DNS", "dns2", None, None),
    ("uptime", "Uptime", "uptimeSeconds", SensorDeviceClass.DURATION, "s"),
    ("used_heap", "Used heap", "usedHeapBytes", SensorDeviceClass.DATA_SIZE, UnitOfInformation.BYTES),
    ("total_heap", "Total heap", "totalHeapBytes", SensorDeviceClass.DATA_SIZE, UnitOfInformation.BYTES),
    ("free_heap", "Free heap", "freeHeapBytes", SensorDeviceClass.DATA_SIZE, UnitOfInformation.BYTES),
    ("minimum_free_heap", "Minimum free heap", "minimumFreeHeapBytes", SensorDeviceClass.DATA_SIZE, UnitOfInformation.BYTES),
    ("largest_free_heap_block", "Largest free heap block", "maximumFreeBlockBytes", SensorDeviceClass.DATA_SIZE, UnitOfInformation.BYTES),
    ("heap_fragmentation", "Heap fragmentation", "heapFragmentationPercent", None, PERCENTAGE),
    ("firmware_version", "Firmware version", "firmwareVersion", None, None),
    ("last_reset_reason", "Last reset reason", "resetReason", None, None),
    ("last_sync", "Last synchronization", "lastSync", SensorDeviceClass.TIMESTAMP, None),
    ("ntp_server", "NTP server", "ntpServer", None, None),
    ("ntp_source", "NTP source", "ntpFromDhcp", None, None),
    ("time_zone", "Time zone", "timezone", None, None),
    ("reconnect_count", "Wi-Fi reconnect count", "reconnectCount", None, None),
    ("last_disconnect_reason", "Last disconnect reason", "lastDisconnectReason", None, None),
    ("tls_certificate_source", "TLS certificate source", "tlsCertificateSource", None, None),
    ("tls_certificate_algorithm", "TLS certificate algorithm", "tlsCertificateAlgorithm", None, None),
    ("tls_certificate_fingerprint", "TLS certificate fingerprint", "tlsCertificateFingerprint", None, None),
    (
        "wifi_retry_limit",
        "Setup Mode activation attempts",
        "wifiRetryLimit",
        None,
        None,
    ),
    ("recovery_network", "Setup Mode Wi-Fi network", "recoverySsid", None, None),
    ("dashboard_page_count", "Dashboard pages", "dashboardPageCount", None, None),
    ("tracked_value_count", "Tracked values", "trackedValueCount", None, None),
)


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    coordinator = hass.data["mini_display"][entry.entry_id]["coordinator"]
    async_add_entities(MiniDisplaySensor(coordinator, *definition) for definition in SENSORS)


class MiniDisplaySensor(MiniDisplayEntity, SensorEntity):
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator, key, name, status_key, device_class, unit) -> None:
        super().__init__(coordinator, key)
        self._attr_name = name
        self._status_key = status_key
        self._attr_device_class = device_class
        self._attr_native_unit_of_measurement = unit

    @property
    def native_value(self):
        if self._status_key == "firmwareVersion":
            info = self.coordinator.device_info
            return info.firmware_version if info else None
        if self._status_key == "timezone":
            rule = self.coordinator.data.get("timezone")
            return next(
                (name for name, value in TIMEZONE_OPTIONS.items() if value == rule),
                rule,
            )
        if self._status_key == "staticIpEnabled":
            return "Static" if self.coordinator.data.get(self._status_key) else "DHCP"
        if self._status_key == "ntpFromDhcp":
            return "DHCP" if self.coordinator.data.get(self._status_key) else "Custom"
        return self.coordinator.data.get(self._status_key)
