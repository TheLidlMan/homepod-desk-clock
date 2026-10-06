"""Mini Display integration switches."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.const import EntityCategory

from .entity import MiniDisplayEntity


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    """Set up per-display switches."""
    runtime = hass.data["mini_display"][entry.entry_id]
    async_add_entities(
        [
            MiniDisplayDataUpdatesSwitch(
                runtime["coordinator"], runtime["dashboard"]
            ),
            MiniDisplayAutomaticPagesSwitch(runtime["coordinator"]),
        ]
    )


class MiniDisplayAutomaticPagesSwitch(MiniDisplayEntity, SwitchEntity):
    """Control rotation without changing the visible page."""

    _attr_name = "Automatic page rotation"
    _attr_icon = "mdi:autorenew"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "automatic_page_rotation")

    @property
    def is_on(self) -> bool | None:
        mode = (self.coordinator.data or {}).get("rotation")
        return mode == "auto" if mode in ("auto", "manual") else None

    async def async_turn_on(self, **kwargs) -> None:
        await self.coordinator.client.async_set_page_rotation(True)
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs) -> None:
        await self.coordinator.client.async_set_page_rotation(False)
        await self.coordinator.async_request_refresh()


class MiniDisplayDataUpdatesSwitch(MiniDisplayEntity, SwitchEntity):
    """Control periodic entity-state forwarding to one display."""

    _attr_name = "Periodic data updates"
    _attr_icon = "mdi:sync"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator, dashboard) -> None:
        super().__init__(coordinator, "periodic_data_updates")
        self.dashboard = dashboard

    @property
    def is_on(self) -> bool:
        return self.dashboard.data_forwarding_enabled

    async def async_turn_on(self, **kwargs) -> None:
        await self.dashboard.async_set_data_forwarding_enabled(True)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        await self.dashboard.async_set_data_forwarding_enabled(False)
        self.async_write_ha_state()
