"""Active dashboard page selector."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.const import EntityCategory
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send

from .const import SIGNAL_SCENES_UPDATED, TIMEZONE_OPTIONS
from .entity import MiniDisplayEntity
from .notification import MiniDisplayNotificationPositionSelect


async def async_setup_entry(hass, entry, async_add_entities) -> None:
    runtime = hass.data["mini_display"][entry.entry_id]
    async_add_entities(
        [
            MiniDisplayPageSelect(runtime["coordinator"]),
            MiniDisplaySceneSelect(runtime["coordinator"], runtime["dashboard"]),
            MiniDisplayTimezoneSelect(runtime["coordinator"]),
            MiniDisplayNotificationPositionSelect(runtime["coordinator"]),
        ]
    )


class MiniDisplayPageSelect(MiniDisplayEntity, SelectEntity):
    _attr_name = "Active page"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "active_page")

    @property
    def current_option(self) -> str | None:
        if self.coordinator.data.get("rotation") == "auto":
            return "auto"
        return self.coordinator.data.get("page")

    @property
    def options(self) -> list[str]:
        pages = self.coordinator.data.get("pages", [])
        return ["auto", *(str(page) for page in pages)]

    async def async_select_option(self, option: str) -> None:
        await self.coordinator.client.async_set_page(option)
        await self.coordinator.async_request_refresh()


class MiniDisplaySceneSelect(MiniDisplayEntity, SelectEntity):
    """Select the dashboard scene active on one physical display."""

    _attr_name = "Scene"

    def __init__(self, coordinator, dashboard) -> None:
        super().__init__(coordinator, "scene")
        self.dashboard = dashboard

    async def async_added_to_hass(self) -> None:
        """Listen for scene catalogue and activation changes."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_SCENES_UPDATED, self._async_scenes_updated
            )
        )

    @callback
    def _async_scenes_updated(self) -> None:
        self.async_write_ha_state()

    @property
    def current_option(self) -> str | None:
        return self.dashboard.scene_name()

    @property
    def options(self) -> list[str]:
        return [scene["name"] for scene in self.dashboard.configured_scene_summaries]

    async def async_select_option(self, option: str) -> None:
        scene = next(
            (
                scene
                for scene in self.dashboard.configured_scene_summaries
                if scene["name"] == option
            ),
            None,
        )
        if scene is None:
            raise ValueError(f"Unknown scene: {option}")
        await self.dashboard.async_activate_scene(scene["id"])
        await self.coordinator.async_request_refresh()
        async_dispatcher_send(self.hass, SIGNAL_SCENES_UPDATED)


class MiniDisplayTimezoneSelect(MiniDisplayEntity, SelectEntity):
    """Configure clock time zone on one physical display."""

    _attr_name = "Time zone"
    _attr_icon = "mdi:map-clock"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator, "time_zone")

    @property
    def current_option(self) -> str | None:
        rule = self.coordinator.data.get("timezone")
        if not rule:
            return None
        return next(
            (name for name, value in TIMEZONE_OPTIONS.items() if value == rule),
            f"Custom: {rule}",
        )

    @property
    def options(self) -> list[str]:
        options = list(TIMEZONE_OPTIONS)
        current = self.current_option
        if current and current.startswith("Custom: "):
            options.append(current)
        return options

    async def async_select_option(self, option: str) -> None:
        rule = TIMEZONE_OPTIONS.get(option)
        if rule is None:
            raise ValueError(f"Unknown time zone: {option}")
        await self.coordinator.client.async_set_display(timezone=rule)
        await self.coordinator.async_request_refresh()
