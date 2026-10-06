"""Command buttons for a MiniDisplay display."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.const import EntityCategory

from .entity import MiniDisplayEntity


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    coordinator = hass.data["mini_display"][entry.entry_id]["coordinator"]
    async_add_entities(
        [
            MiniDisplayCommandButton(coordinator, "next_page", "Next page", "next"),
            MiniDisplayCommandButton(
                coordinator, "previous_page", "Previous page", "previous"
            ),
            MiniDisplayCommandButton(
                coordinator,
                "reload_dashboard",
                "Reload dashboard",
                "reload",
                EntityCategory.CONFIG,
            ),
            MiniDisplayDismissNotificationsButton(coordinator),
            MiniDisplayRestartButton(coordinator),
        ]
    )


class MiniDisplayCommandButton(MiniDisplayEntity, ButtonEntity):
    def __init__(
        self,
        coordinator,
        key: str,
        name: str,
        command: str,
        category: EntityCategory | None = None,
    ) -> None:
        super().__init__(coordinator, key)
        self._attr_name = name
        self._attr_entity_category = category
        self._command = command

    async def async_press(self) -> None:
        await self.coordinator.client.async_page_command(self._command)
        await self.coordinator.async_request_refresh()


class MiniDisplayRestartButton(MiniDisplayEntity, ButtonEntity):
    _attr_name = "Restart"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "restart")

    async def async_press(self) -> None:
        await self.coordinator.client.async_restart()


class MiniDisplayDismissNotificationsButton(MiniDisplayEntity, ButtonEntity):
    _attr_name = "Dismiss notifications"
    _attr_icon = "mdi:message-off-outline"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "dismiss_notifications")

    @property
    def available(self) -> bool:
        return super().available and "notificationPositions" in self.coordinator.data

    async def async_press(self) -> None:
        await self.coordinator.client.async_dismiss_notifications()
        await self.coordinator.async_request_refresh()
