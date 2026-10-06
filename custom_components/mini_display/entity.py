"""Shared MiniDisplay entity model."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import MiniDisplayCoordinator


class MiniDisplayEntity(CoordinatorEntity[MiniDisplayCoordinator]):
    """Base class tied to one physical display."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: MiniDisplayCoordinator, key: str) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.entry.unique_id}_{key}"

    @property
    def device_info(self) -> DeviceInfo:
        info = self.coordinator.device_info
        return DeviceInfo(
            identifiers={(DOMAIN, self.coordinator.entry.unique_id)},
            name=info.name if info else self.coordinator.entry.title,
            manufacturer="Home Assistant Mini-Display",
            model=info.model if info else "JUZIPi SD PRO",
            sw_version=info.firmware_version if info else None,
            configuration_url=f"http://{self.coordinator.entry.data['host']}/",
        )
