"""Config flow for local MiniDisplay displays."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    MiniDisplayAuthError,
    MiniDisplayClient,
    MiniDisplayConnectionError,
    MiniDisplayInvalidResponseError,
)
from .const import (
    CONF_API_TOKEN,
    CONF_DATA_BATCH_INTERVAL,
    CONF_DEVICE_ID,
    CONF_USE_SSL,
    CONF_VERIFY_SSL,
    DEFAULT_DATA_BATCH_INTERVAL_SECONDS,
    DEFAULT_HTTPS_PORT,
    DEFAULT_PORT,
    DOMAIN,
    FEATURE_TLS,
)


class MiniDisplayConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up one display from UI or Zeroconf discovery."""

    VERSION = 2

    def __init__(self) -> None:
        self._discovered_host: str | None = None
        self._discovered_port = DEFAULT_PORT
        self._discovered_use_ssl = False

    @staticmethod
    @callback
    def async_get_options_flow(config_entry) -> OptionsFlow:
        """Return per-display integration options."""
        return MiniDisplayOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            result = await self._async_validate(user_input)
            if isinstance(result, dict):
                errors = result
            else:
                info, data = result
                await self.async_set_unique_id(info.device_id)
                self._abort_if_unique_id_configured(updates={CONF_HOST: data[CONF_HOST]})
                return self.async_create_entry(title=info.name, data=data)

        fields: dict[Any, Any] = {
                vol.Required(
                    CONF_HOST, default=self._discovered_host or "mini-display.local"
                ): str,
                vol.Required(CONF_PORT, default=self._discovered_port): int,
                vol.Optional(CONF_API_TOKEN, default=""): selector.TextSelector(
                    selector.TextSelectorConfig(
                        type=selector.TextSelectorType.PASSWORD
                    )
                ),
            }
        if FEATURE_TLS:
            fields.update(
                {
                    vol.Required(
                        CONF_USE_SSL, default=self._discovered_use_ssl
                    ): selector.BooleanSelector(),
                    vol.Required(
                        CONF_VERIFY_SSL, default=True
                    ): selector.BooleanSelector(),
                }
            )
        schema = vol.Schema(fields)
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_zeroconf(self, discovery_info) -> ConfigFlowResult:
        properties = discovery_info.properties
        device_id = properties.get("id")
        if not device_id:
            return self.async_abort(reason="invalid_discovery_info")
        await self.async_set_unique_id(device_id)
        self._abort_if_unique_id_configured(
            updates={CONF_HOST: discovery_info.host, CONF_PORT: discovery_info.port}
        )
        self._discovered_host = discovery_info.host
        self._discovered_use_ssl = FEATURE_TLS and properties.get("https") == "1"
        self._discovered_port = 443 if self._discovered_use_ssl else discovery_info.port
        self.context["title_placeholders"] = {"name": discovery_info.name}
        return await self.async_step_user()

    async def async_step_reauth(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Start re-authentication after the device rejects its password."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Validate and store a replacement device password."""
        entry = self._get_reauth_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            candidate = {
                CONF_HOST: entry.data[CONF_HOST],
                CONF_PORT: entry.data[CONF_PORT],
                CONF_API_TOKEN: user_input[CONF_API_TOKEN],
                CONF_USE_SSL: entry.data.get(CONF_USE_SSL, False),
                CONF_VERIFY_SSL: entry.data.get(CONF_VERIFY_SSL, True),
            }
            result = await self._async_validate(candidate)
            if isinstance(result, dict):
                errors = result
            else:
                info, _ = result
                if info.device_id != entry.data[CONF_DEVICE_ID]:
                    return self.async_abort(reason="wrong_device")
                return self.async_update_reload_and_abort(
                    entry,
                    data_updates={CONF_API_TOKEN: user_input[CONF_API_TOKEN]},
                )

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema(
                {
                    vol.Optional(CONF_API_TOKEN, default=""): selector.TextSelector(
                        selector.TextSelectorConfig(
                            type=selector.TextSelectorType.PASSWORD
                        )
                    )
                }
            ),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Change address and TLS settings without replacing the entry."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            candidate = {**user_input, CONF_API_TOKEN: entry.data[CONF_API_TOKEN]}
            result = await self._async_validate(candidate)
            if isinstance(result, dict):
                errors = result
            else:
                info, data = result
                if info.device_id != entry.data[CONF_DEVICE_ID]:
                    return self.async_abort(reason="wrong_device")
                await self.async_set_unique_id(info.device_id)
                self._abort_if_unique_id_mismatch()
                return self.async_update_reload_and_abort(entry, data_updates=data)

        fields: dict[Any, Any] = {
            vol.Required(CONF_HOST, default=entry.data[CONF_HOST]): str,
            vol.Required(CONF_PORT, default=entry.data[CONF_PORT]): int,
        }
        if FEATURE_TLS:
            fields.update(
                {
                    vol.Required(
                        CONF_USE_SSL,
                        default=entry.data.get(CONF_USE_SSL, False),
                    ): selector.BooleanSelector(),
                    vol.Required(
                        CONF_VERIFY_SSL,
                        default=entry.data.get(CONF_VERIFY_SSL, True),
                    ): selector.BooleanSelector(),
                }
            )
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=vol.Schema(fields),
            errors=errors,
        )

    async def _async_validate(self, user_input: dict[str, Any]):
        use_ssl = FEATURE_TLS and user_input.get(CONF_USE_SSL, False)
        port = int(user_input[CONF_PORT])
        if use_ssl and port == DEFAULT_PORT:
            port = DEFAULT_HTTPS_PORT
        elif not use_ssl and port == DEFAULT_HTTPS_PORT:
            port = DEFAULT_PORT
        client = MiniDisplayClient(
            async_get_clientsession(self.hass),
            user_input[CONF_HOST],
            user_input[CONF_API_TOKEN],
            port,
            use_ssl=use_ssl,
            verify_ssl=user_input.get(CONF_VERIFY_SSL, True),
        )
        try:
            info = await client.async_get_info()
        except MiniDisplayAuthError:
            return {"base": "invalid_auth"}
        except MiniDisplayConnectionError:
            return {"base": "cannot_connect"}
        except MiniDisplayInvalidResponseError:
            return {"base": "unsupported_device"}
        data = {
            CONF_HOST: user_input[CONF_HOST],
            CONF_PORT: port,
            CONF_API_TOKEN: user_input[CONF_API_TOKEN],
            CONF_DEVICE_ID: info.device_id,
            CONF_USE_SSL: use_ssl,
            CONF_VERIFY_SSL: user_input.get(CONF_VERIFY_SSL, True),
        }
        return info, data


class MiniDisplayOptionsFlow(OptionsFlow):
    """Configure update batching for one display."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        current = self.config_entry.options.get(
            CONF_DATA_BATCH_INTERVAL, DEFAULT_DATA_BATCH_INTERVAL_SECONDS
        )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_DATA_BATCH_INTERVAL, default=current
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0))
                }
            ),
        )
