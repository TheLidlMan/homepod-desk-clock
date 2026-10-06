"""MiniDisplay local display integration."""

from __future__ import annotations

import hashlib
from pathlib import Path
import re

import voluptuous as vol

from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .api import MiniDisplayApiError, MiniDisplayClient, MiniDisplayRequestError
from .assets import AssetValidationError
from .const import (
    CONF_API_TOKEN,
    CONF_DATA_BATCH_INTERVAL,
    CONF_USE_SSL,
    CONF_VERIFY_SSL,
    DEFAULT_DATA_BATCH_INTERVAL_SECONDS,
    DOMAIN,
    FRONTEND_DIR,
    FRONTEND_URL,
    LEGACY_FRONTEND_URL,
    PANEL_URL_PATH,
    PANEL_WEB_COMPONENT,
    PLATFORMS,
    SIGNAL_SCENES_UPDATED,
)
from .coordinator import MiniDisplayCoordinator
from .notification import async_register_notification_services
from .weather import WeatherData, validate_weather
from .dashboard import (
    DEFAULT_SCENE_ID,
    DEFAULT_SCENE_NAME,
    DashboardValidationError,
    MiniDisplayDashboardManager,
)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register frontend assets and integration WebSocket commands once."""
    hass.data.setdefault(DOMAIN, {})
    async_register_notification_services(hass)
    panel_path = FRONTEND_DIR / "mini-display-panel.js"
    if panel_path.exists():
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL, str(panel_path), cache_headers=False)]
        )
        await _async_register_frontend_panel(hass, panel_path)
        await _async_remove_legacy_lovelace_card(hass)
    websocket_api.async_register_command(hass, websocket_list_displays)
    websocket_api.async_register_command(hass, websocket_get_dashboard)
    websocket_api.async_register_command(hass, websocket_set_dashboard)
    websocket_api.async_register_command(hass, websocket_show_page)
    websocket_api.async_register_command(hass, websocket_list_scenes)
    websocket_api.async_register_command(hass, websocket_create_scene)
    websocket_api.async_register_command(hass, websocket_duplicate_scene)
    websocket_api.async_register_command(hass, websocket_rename_scene)
    websocket_api.async_register_command(hass, websocket_set_default_scene)
    websocket_api.async_register_command(hass, websocket_delete_scene)
    websocket_api.async_register_command(hass, websocket_activate_scene)
    websocket_api.async_register_command(hass, websocket_start_scene_preview)
    websocket_api.async_register_command(hass, websocket_stop_scene_preview)
    websocket_api.async_register_command(hass, websocket_list_assets)
    websocket_api.async_register_command(hass, websocket_get_data)
    websocket_api.async_register_command(hass, websocket_weather)
    websocket_api.async_register_command(hass, websocket_upload_asset)
    websocket_api.async_register_command(hass, websocket_delete_asset)
    return True


async def _async_register_frontend_panel(
    hass: HomeAssistant, panel_path: Path
) -> None:
    """Register the display manager as an administrator-only sidebar panel."""
    panel_bytes = await hass.async_add_executor_job(panel_path.read_bytes)
    content_hash = hashlib.sha256(panel_bytes).hexdigest()[:12]
    resource_url = f"{FRONTEND_URL}?v={content_hash}"
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_WEB_COMPONENT,
        frontend_url_path=PANEL_URL_PATH,
        module_url=resource_url,
        sidebar_title="Mini Displays",
        sidebar_icon="mdi:monitor-dashboard",
        embed_iframe=False,
        require_admin=True,
    )


async def _async_remove_legacy_lovelace_card(hass: HomeAssistant) -> None:
    """Remove the resource created by versions that shipped a Lovelace card."""
    lovelace = hass.data.get("lovelace")
    resources = getattr(lovelace, "resources", None)
    if resources is None and isinstance(lovelace, dict):
        resources = lovelace.get("resources")

    if isinstance(resources, ResourceStorageCollection):
        await resources.async_get_info()
        for item in list(resources.async_items()):
            item_url = item.get("url", "")
            if item_url.split("?", 1)[0] == LEGACY_FRONTEND_URL:
                await resources.async_delete_item(item["id"])


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up one configured display."""
    client = MiniDisplayClient(
        async_get_clientsession(hass),
        entry.data[CONF_HOST],
        entry.data[CONF_API_TOKEN],
        entry.data[CONF_PORT],
        use_ssl=entry.data.get(CONF_USE_SSL, False),
        verify_ssl=entry.data.get(CONF_VERIFY_SSL, True),
    )
    coordinator = MiniDisplayCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()
    dashboard = MiniDisplayDashboardManager(
        hass,
        entry.entry_id,
        client,
        entry.options.get(
            CONF_DATA_BATCH_INTERVAL, DEFAULT_DATA_BATCH_INTERVAL_SECONDS
        ),
    )
    await dashboard.async_load()
    last_boot_id = coordinator.data.get("bootId")

    @callback
    def _status_updated() -> None:
        nonlocal last_boot_id
        boot_id = coordinator.data.get("bootId")
        if boot_id is None or boot_id == last_boot_id:
            return
        last_boot_id = boot_id
        hass.async_create_task(dashboard.async_resynchronize())

    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "dashboard": dashboard,
    }
    try:
        await dashboard.async_resynchronize()
    except MiniDisplayApiError as err:
        # Failed setup must not leave a sender repeatedly uploading dashboards.
        dashboard.close()
        hass.data[DOMAIN].pop(entry.entry_id, None)
        raise ConfigEntryNotReady("Display synchronization will retry") from err
    entry.async_on_unload(coordinator.async_add_listener(_status_updated))
    await _async_reconcile_scenes(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Add explicit transport defaults to entries created before HTTPS support."""
    if entry.version == 1:
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_USE_SSL: False,
                CONF_VERIFY_SSL: True,
            },
            version=2,
        )
    return True


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload one display after its options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a display."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        runtime = hass.data[DOMAIN].pop(entry.entry_id, None)
        if runtime:
            runtime["dashboard"].close()
    return unloaded


def _display_runtimes(hass: HomeAssistant) -> list[dict]:
    """Return configured display runtimes, excluding domain metadata."""
    return [
        runtime
        for runtime in hass.data.get(DOMAIN, {}).values()
        if isinstance(runtime, dict) and "dashboard" in runtime
    ]


async def _async_reconcile_scenes(hass: HomeAssistant) -> None:
    """Keep the global scene catalogue available on every display."""
    runtimes = _display_runtimes(hass)
    catalogue: dict[str, str] = {}
    for runtime in runtimes:
        for scene in runtime["dashboard"].scene_summaries:
            catalogue.setdefault(scene["id"], scene["name"])
    if not catalogue:
        catalogue[DEFAULT_SCENE_ID] = DEFAULT_SCENE_NAME
    default_scene_id = (
        runtimes[0]["dashboard"].default_scene_id
        if runtimes
        else DEFAULT_SCENE_ID
    )
    for runtime in runtimes:
        manager = runtime["dashboard"]
        for scene_id, name in catalogue.items():
            await manager.async_create_scene(scene_id, name)
        await manager.async_set_default_scene(default_scene_id)


def _scene_catalogue(hass: HomeAssistant) -> list[dict[str, object]]:
    """Return the union of scenes configured across displays."""
    runtimes = _display_runtimes(hass)
    catalogue: dict[str, str] = {}
    for runtime in runtimes:
        for scene in runtime["dashboard"].scene_summaries:
            catalogue.setdefault(scene["id"], scene["name"])
    if not catalogue:
        catalogue[DEFAULT_SCENE_ID] = DEFAULT_SCENE_NAME
    default_scene_id = (
        runtimes[0]["dashboard"].default_scene_id
        if runtimes
        else DEFAULT_SCENE_ID
    )
    return [
        {
            "id": scene_id,
            "name": name,
            "is_default": scene_id == default_scene_id,
        }
        for scene_id, name in catalogue.items()
    ]


def _new_scene_id(hass: HomeAssistant, name: str) -> str:
    """Create a readable unique scene id."""
    base = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_") or "scene"
    base = base[:32]
    existing = {scene["id"] for scene in _scene_catalogue(hass)}
    candidate = base
    suffix = 2
    while candidate in existing:
        ending = f"_{suffix}"
        candidate = f"{base[: 32 - len(ending)]}{ending}"
        suffix += 1
    return candidate


def _scene_name_exists(
    hass: HomeAssistant, name: str, *, excluding_id: str | None = None
) -> bool:
    """Return whether another scene already uses a display name."""
    normalized = name.casefold()
    return any(
        scene["id"] != excluding_id and scene["name"].casefold() == normalized
        for scene in _scene_catalogue(hass)
    )


def _new_copy_name(hass: HomeAssistant, source_name: str) -> str:
    """Create a unique human-readable name for a duplicated scene."""
    base = f"{source_name} copy"
    candidate = base
    suffix = 2
    while _scene_name_exists(hass, candidate):
        candidate = f"{base} {suffix}"
        suffix += 1
    return candidate


@websocket_api.websocket_command({"type": "mini_display/displays"})
@websocket_api.async_response
async def websocket_list_displays(hass, connection, msg) -> None:
    """Return configured displays for the management panel."""
    displays = []
    for entry in hass.config_entries.async_entries(DOMAIN):
        runtime = hass.data.get(DOMAIN, {}).get(entry.entry_id)
        coordinator = runtime["coordinator"] if runtime else None
        displays.append(
            {
                "config_entry_id": entry.entry_id,
                "title": entry.title,
                "available": bool(coordinator and coordinator.last_update_success),
                "active_scene_id": runtime["dashboard"].active_scene_id if runtime else None,
                "active_scene_name": runtime["dashboard"].scene_name() if runtime else None,
                "preview_scene_id": runtime["dashboard"].preview_scene_id if runtime else None,
                "width": coordinator.device_info.width
                if coordinator and coordinator.device_info
                else 240,
                "height": coordinator.device_info.height
                if coordinator and coordinator.device_info
                else 240,
                "default_font": coordinator.data.get("defaultFont", "builtin")
                if coordinator
                else "builtin",
                "fonts": coordinator.data.get("fonts", []) if coordinator else [],
                "refresh_rate_hz": coordinator.data.get("refreshRateHz", 60) if coordinator else 60,
            }
        )
    connection.send_result(msg["id"], displays)


@websocket_api.websocket_command(
    {"type": "mini_display/data", vol.Required("config_entry_id"): str}
)
@websocket_api.async_response
async def websocket_get_data(hass, connection, msg) -> None:
    """Read the display's retained entity states and chart history."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "Display not found")
        return
    try:
        result = await runtime["dashboard"].client.async_get_data()
        connection.send_result(msg["id"], result)
    except MiniDisplayApiError as error:
        connection.send_error(msg["id"], "display_unavailable", str(error))


@websocket_api.websocket_command({"type": "mini_display/weather", vol.Required("card"): dict})
@websocket_api.async_response
async def websocket_weather(hass, connection, msg) -> None:
    """Preview the same selected weather values used by the physical display."""
    card = {"type": "weather", "source": msg["card"].get("source"),
            "weather": msg["card"].get("weather", {})}
    try:
        validate_weather(card, "/card", DashboardValidationError)
    except (DashboardValidationError, TypeError, ValueError) as error:
        connection.send_error(msg["id"], "invalid_weather", str(error))
        return
    weather = hass.data.setdefault("mini_display_weather_cache", WeatherData(hass))
    values = await weather.values({"pages": [{"rows": [{"cards": [card]}]}]}, compile_cards=True)
    connection.send_result(msg["id"], {"weather": card["weather"], "values": values})


@websocket_api.websocket_command({"type": "mini_display/scenes"})
@websocket_api.async_response
async def websocket_list_scenes(hass, connection, msg) -> None:
    """Return the global scene catalogue."""
    connection.send_result(msg["id"], _scene_catalogue(hass))


@websocket_api.websocket_command(
    {
        "type": "mini_display/dashboard/get",
        "config_entry_id": str,
        vol.Optional("scene_id"): str,
    }
)
@websocket_api.async_response
async def websocket_get_dashboard(hass, connection, msg) -> None:
    """Return the canonical dashboard stored for one display."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    manager = runtime["dashboard"]
    scene_id = msg.get("scene_id", manager.active_scene_id)
    connection.send_result(msg["id"], manager.get_dashboard(scene_id))


@websocket_api.websocket_command(
    {
        "type": "mini_display/dashboard/set",
        "config_entry_id": str,
        "dashboard": dict,
        vol.Optional("scene_id"): str,
        vol.Optional("page_id"): str,
    }
)
@websocket_api.async_response
async def websocket_set_dashboard(hass, connection, msg) -> None:
    """Validate, send, and persist one physical dashboard."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    try:
        await runtime["dashboard"].async_apply(
            msg["dashboard"], msg.get("page_id"), msg.get("scene_id")
        )
    except DashboardValidationError as err:
        connection.send_error(
            msg["id"], "invalid_dashboard", f"{err.path}: {err}"
        )
        return
    except MiniDisplayRequestError as err:
        connection.send_error(
            msg["id"],
            "storage_full" if err.status == 507 else "display_unavailable" if err.status == 503 else "display_rejected",
            str(err),
        )
        return
    except MiniDisplayApiError:
        connection.send_error(
            msg["id"], "display_unavailable", "Mini-Display did not respond"
        )
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {
        "type": "mini_display/assets",
        "config_entry_id": str,
        vol.Optional("include_data", default=True): bool,
    }
)
@websocket_api.async_response
async def websocket_list_assets(hass, connection, msg) -> None:
    """Return optimized image assets for one display."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    manager = runtime["dashboard"]
    assets = manager.assets.list(include_data=msg["include_data"])
    for asset in assets:
        asset["used_by"] = manager.asset_references(asset["id"])
    connection.send_result(msg["id"], assets)


@websocket_api.websocket_command(
    {
        "type": "mini_display/asset/upload",
        "config_entry_id": str,
        "asset_id": str,
        "name": str,
        "width": int,
        "height": int,
        "data": str,
        "preview": str,
    }
)
@websocket_api.async_response
async def websocket_upload_asset(hass, connection, msg) -> None:
    """Persist one image already optimized by the browser."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    try:
        asset = await runtime["dashboard"].assets.async_put(
            msg["asset_id"], msg["name"], msg["width"], msg["height"],
            msg["data"], msg["preview"]
        )
    except AssetValidationError as err:
        connection.send_error(msg["id"], "invalid_asset", str(err))
        return
    connection.send_result(msg["id"], asset)


@websocket_api.websocket_command(
    {
        "type": "mini_display/asset/delete",
        "config_entry_id": str,
        "asset_id": str,
    }
)
@websocket_api.async_response
async def websocket_delete_asset(hass, connection, msg) -> None:
    """Delete an image asset from HA and the display."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    manager = runtime["dashboard"]
    references = manager.asset_references(msg["asset_id"])
    if references:
        connection.send_error(
            msg["id"],
            "asset_in_use",
            f"Image is used in: {', '.join(references)}",
        )
        return
    try:
        await manager.assets.async_delete(msg["asset_id"])
    except MiniDisplayApiError:
        connection.send_error(msg["id"], "display_unavailable", "Mini-Display did not respond")
        return
    connection.send_result(msg["id"], {"deleted": True})


@websocket_api.websocket_command(
    {
        "type": "mini_display/scene/create",
        "name": vol.All(str, vol.Strip, vol.Length(min=1, max=48)),
    }
)
@websocket_api.async_response
async def websocket_create_scene(hass, connection, msg) -> None:
    """Create one scene for every configured display."""
    if _scene_name_exists(hass, msg["name"]):
        connection.send_error(msg["id"], "invalid_scene", "Scene name already exists")
        return
    scene_id = _new_scene_id(hass, msg["name"])
    for runtime in _display_runtimes(hass):
        await runtime["dashboard"].async_create_scene(scene_id, msg["name"])
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(
        msg["id"], {"id": scene_id, "name": msg["name"], "is_default": False}
    )


@websocket_api.websocket_command(
    {"type": "mini_display/scene/duplicate", "source_scene_id": str}
)
@websocket_api.async_response
async def websocket_duplicate_scene(hass, connection, msg) -> None:
    """Duplicate one scene and all of its per-display layouts."""
    source = next(
        (
            scene
            for scene in _scene_catalogue(hass)
            if scene["id"] == msg["source_scene_id"]
        ),
        None,
    )
    if source is None:
        connection.send_error(msg["id"], "invalid_scene", "Source scene not found")
        return
    name = _new_copy_name(hass, str(source["name"]))
    scene_id = _new_scene_id(hass, name)
    try:
        for runtime in _display_runtimes(hass):
            await runtime["dashboard"].async_duplicate_scene(
                msg["source_scene_id"], scene_id, name
            )
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(
        msg["id"], {"id": scene_id, "name": name, "is_default": False}
    )


@websocket_api.websocket_command(
    {
        "type": "mini_display/scene/rename",
        "scene_id": str,
        "name": vol.All(str, vol.Strip, vol.Length(min=1, max=48)),
    }
)
@websocket_api.async_response
async def websocket_rename_scene(hass, connection, msg) -> None:
    """Rename a scene on every display."""
    if _scene_name_exists(hass, msg["name"], excluding_id=msg["scene_id"]):
        connection.send_error(msg["id"], "invalid_scene", "Scene name already exists")
        return
    try:
        for runtime in _display_runtimes(hass):
            await runtime["dashboard"].async_rename_scene(msg["scene_id"], msg["name"])
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {"type": "mini_display/scene/default", "scene_id": str}
)
@websocket_api.async_response
async def websocket_set_default_scene(hass, connection, msg) -> None:
    """Set the global default scene without activating it."""
    try:
        for runtime in _display_runtimes(hass):
            await runtime["dashboard"].async_set_default_scene(msg["scene_id"])
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {"type": "mini_display/scene/delete", "scene_id": str}
)
@websocket_api.async_response
async def websocket_delete_scene(hass, connection, msg) -> None:
    """Delete a scene from every display."""
    try:
        for runtime in _display_runtimes(hass):
            await runtime["dashboard"].async_delete_scene(msg["scene_id"])
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {
        "type": "mini_display/scene/activate",
        "config_entry_id": str,
        "scene_id": str,
    }
)
@websocket_api.async_response
async def websocket_activate_scene(hass, connection, msg) -> None:
    """Activate one scene on one physical display."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    try:
        await runtime["dashboard"].async_activate_scene(msg["scene_id"])
        await runtime["coordinator"].async_request_refresh()
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    async_dispatcher_send(hass, SIGNAL_SCENES_UPDATED)
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {
        "type": "mini_display/scene/preview/start",
        "config_entry_id": str,
        "scene_id": str,
        vol.Optional("page_id"): str,
        vol.Optional("dashboard"): dict,
        vol.Optional("update", default=False): bool,
    }
)
@websocket_api.async_response
async def websocket_start_scene_preview(hass, connection, msg) -> None:
    """Temporarily show a scene on one display."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    try:
        manager = runtime["dashboard"]
        await manager.async_start_preview(
            msg["scene_id"],
            msg.get("page_id"),
            msg.get("dashboard"),
            owner=connection,
            update=msg["update"],
        )
    except MiniDisplayApiError as err:
        connection.send_error(msg["id"], "display_unavailable", str(err))
        return
    except DashboardValidationError as err:
        connection.send_error(msg["id"], "invalid_scene", str(err))
        return
    def stop_preview_on_disconnect() -> None:
        hass.async_create_task(manager.async_stop_preview(owner=connection))

    if not msg["update"]:
        connection.subscriptions[msg["id"]] = stop_preview_on_disconnect
    connection.send_result(msg["id"], {"accepted": True, "timeout": 300})


@websocket_api.websocket_command(
    {"type": "mini_display/scene/preview/stop", "config_entry_id": str}
)
@websocket_api.async_response
async def websocket_stop_scene_preview(hass, connection, msg) -> None:
    """Stop temporary preview and restore the active scene."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    await runtime["dashboard"].async_stop_preview()
    connection.send_result(msg["id"], {"accepted": True})


@websocket_api.websocket_command(
    {"type": "mini_display/page/show", "config_entry_id": str, "page_id": str}
)
@websocket_api.async_response
async def websocket_show_page(hass, connection, msg) -> None:
    """Show a page while it is being edited."""
    runtime = hass.data.get(DOMAIN, {}).get(msg["config_entry_id"])
    if runtime is None:
        connection.send_error(msg["id"], "not_found", "MiniDisplay display not found")
        return
    await runtime["coordinator"].client.async_set_page(msg["page_id"])
    connection.send_result(msg["id"], {"accepted": True})
