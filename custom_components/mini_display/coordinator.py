"""State coordinator for a MiniDisplay display."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry, ConfigEntryAuthFailed
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import MiniDisplayApiError, MiniDisplayAuthError, MiniDisplayClient
from .const import DEFAULT_SCAN_INTERVAL_SECONDS, DOMAIN, FEATURE_TLS


class MiniDisplayCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Poll status while commands are sent directly through the same client."""

    def __init__(
        self, hass: HomeAssistant, entry: ConfigEntry, client: MiniDisplayClient
    ) -> None:
        super().__init__(
            hass,
            logger=__import__("logging").getLogger(__name__),
            name=f"{DOMAIN}-{entry.entry_id}",
            update_interval=timedelta(seconds=DEFAULT_SCAN_INTERVAL_SECONDS),
        )
        self.entry = entry
        self.client = client
        self.device_info = None

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            if self.device_info is None:
                self.device_info = await self.client.async_get_info()
            status = await self.client.async_get_status()
            self.client.data_limiter.set_rate(status.get("refreshRateHz"))
            self._update_transport_issue(status)
            status["lastSync"] = datetime.now(UTC)
            return status
        except MiniDisplayAuthError as err:
            raise ConfigEntryAuthFailed("Device password was rejected") from err
        except MiniDisplayApiError as err:
            raise UpdateFailed(str(err)) from err

    def _update_transport_issue(self, status: dict[str, Any]) -> None:
        if not FEATURE_TLS:
            return
        issue_id = f"transport_{self.entry.entry_id}"
        device_prefers_ssl = bool(status.get("httpsEnabled", False))
        configured_ssl = self.client.configured_use_ssl
        active_ssl = self.client.active_use_ssl
        if device_prefers_ssl == configured_ssl and active_ssl == configured_ssl:
            ir.async_delete_issue(self.hass, DOMAIN, issue_id)
            return
        ir.async_create_issue(
            self.hass,
            DOMAIN,
            issue_id,
            is_fixable=False,
            is_persistent=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key="transport_mismatch",
            translation_placeholders={"name": self.entry.title},
            data={"entry_id": self.entry.entry_id},
        )
