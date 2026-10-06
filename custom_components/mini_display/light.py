"""Display power and brightness entity."""

from __future__ import annotations

from homeassistant.components.light import ATTR_BRIGHTNESS, ColorMode, LightEntity

from .entity import MiniDisplayEntity


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    async_add_entities([MiniDisplayDisplayLight(hass.data["mini_display"][entry.entry_id]["coordinator"])])


class MiniDisplayDisplayLight(MiniDisplayEntity, LightEntity):
    _attr_name = "Display"
    _attr_color_mode = ColorMode.BRIGHTNESS
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "display")

    @property
    def is_on(self) -> bool | None:
        return self.coordinator.data.get("displayOn")

    @property
    def brightness(self) -> int | None:
        value = self.coordinator.data.get("brightness")
        return round(int(value) * 255 / 100) if value is not None else None

    async def async_turn_on(self, **kwargs) -> None:
        brightness = kwargs.get(ATTR_BRIGHTNESS)
        percent = round(brightness * 100 / 255) if brightness is not None else None
        await self.coordinator.client.async_set_display(on=True, brightness=percent)
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs) -> None:
        await self.coordinator.client.async_set_display(on=False)
        await self.coordinator.async_request_refresh()
