"""Display brightness control."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.const import EntityCategory, PERCENTAGE

from .const import DOMAIN
from .entity import MiniDisplayEntity


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    """Set up display controls."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities(
        [
            MiniDisplayBrightnessNumber(coordinator),
            MiniDisplayPixelShiftNumber(coordinator),
            MiniDisplayRefreshRateNumber(coordinator),
        ]
    )


class MiniDisplayBrightnessNumber(MiniDisplayEntity, NumberEntity):
    """Control display brightness as a percentage."""

    _attr_name = "Brightness"
    _attr_icon = "mdi:brightness-6"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_mode = NumberMode.SLIDER

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "brightness")

    @property
    def native_value(self) -> float | None:
        """Return current brightness percentage."""
        value = self.coordinator.data.get("brightness")
        return float(value) if value is not None else None

    async def async_set_native_value(self, value: float) -> None:
        """Set brightness and turn the display on."""
        await self.coordinator.client.async_set_display(
            on=True, brightness=round(value)
        )
        await self.coordinator.async_request_refresh()


class MiniDisplayRefreshRateNumber(MiniDisplayEntity, NumberEntity):
    """Limit physical dashboard refreshes independently from data delivery."""

    _attr_name = "Maximum refresh rate"
    _attr_icon = "mdi:monitor-speed"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0.1
    _attr_native_max_value = 60
    _attr_native_step = 0.1
    _attr_native_unit_of_measurement = "Hz"
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "refresh_rate")

    @property
    def available(self) -> bool:
        return super().available and "refreshRateHz" in self.coordinator.data

    @property
    def native_value(self) -> float | None:
        value = self.coordinator.data.get("refreshRateHz")
        return float(value) if value is not None else None

    async def async_set_native_value(self, value: float) -> None:
        await self.coordinator.client.async_set_display(refresh_rate_hz=value)
        await self.coordinator.async_request_refresh()


class MiniDisplayPixelShiftNumber(MiniDisplayEntity, NumberEntity):
    """Move rendered content periodically to reduce image retention."""

    _attr_name = "Pixel shift"
    _attr_icon = "mdi:move-resize"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0
    _attr_native_max_value = 10
    _attr_native_step = 1
    _attr_native_unit_of_measurement = "px"
    _attr_mode = NumberMode.SLIDER

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "pixel_shift")

    @property
    def native_value(self) -> float | None:
        """Return maximum content offset in pixels; zero disables it."""
        value = self.coordinator.data.get("pixelShift")
        return float(value) if value is not None else None

    async def async_set_native_value(self, value: float) -> None:
        """Set the maximum periodic content offset."""
        await self.coordinator.client.async_set_display(pixel_shift=round(value))
        await self.coordinator.async_request_refresh()
