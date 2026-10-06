"""Async local HTTP client for MiniDisplay displays."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json as json_module
from typing import Any

from aiohttp import ClientError, ClientSession, ClientTimeout, FormData

from .const import (
    API_VERSION,
    DEFAULT_HTTPS_PORT,
    DEFAULT_PORT,
    FEATURE_TLS,
    REQUEST_TIMEOUT_SECONDS,
)
from .image_codec import MAX_ENCODED_BYTES
from .data_rate import DataSendLimiter
from .value_batches import split_value_batches


class MiniDisplayApiError(Exception):
    """Base error raised by the MiniDisplay API client."""


class MiniDisplayAuthError(MiniDisplayApiError):
    """Authentication failed."""


class MiniDisplayConnectionError(MiniDisplayApiError):
    """The display could not be reached."""


class MiniDisplayInvalidResponseError(MiniDisplayApiError):
    """The display returned an incompatible response."""


class MiniDisplayRequestError(MiniDisplayApiError):
    """The display rejected a valid HTTP request."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


@dataclass(frozen=True, slots=True)
class DeviceInfo:
    """Stable identity and capabilities returned by a display."""

    device_id: str
    name: str
    model: str
    firmware_version: str
    api_version: int
    width: int
    height: int
    capabilities: tuple[str, ...]


class MiniDisplayClient:
    """Bounded asynchronous client for API version 1."""

    def __init__(
        self,
        session: ClientSession,
        host: str,
        api_token: str,
        port: int = 80,
        *,
        use_ssl: bool = False,
        verify_ssl: bool = True,
    ) -> None:
        self._session = session
        self._host = host
        self._port = port
        self._use_ssl = use_ssl if FEATURE_TLS else False
        self._verify_ssl = verify_ssl
        self._active_transport: tuple[bool, int] | None = None
        self._headers = (
            {"Authorization": f"Bearer {api_token}"} if api_token else {}
        )
        self._timeout = ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
        self._asset_timeout = ClientTimeout(total=60)
        self._request_lock = asyncio.Lock()
        self.data_limiter = DataSendLimiter()

    @property
    def configured_use_ssl(self) -> bool:
        """Return the transport selected in the config entry."""
        return self._use_ssl

    @property
    def active_use_ssl(self) -> bool | None:
        """Return the transport used by the most recent successful request."""
        return self._active_transport[0] if self._active_transport else None

    def _transports(self) -> tuple[tuple[bool, int], ...]:
        if not FEATURE_TLS:
            return ((False, self._port),)
        configured = (self._use_ssl, self._port)
        fallback = (
            (False, DEFAULT_PORT)
            if self._use_ssl
            else (True, DEFAULT_HTTPS_PORT)
        )
        ordered = [self._active_transport, configured, fallback]
        result: list[tuple[bool, int]] = []
        for transport in ordered:
            if transport is not None and transport not in result:
                result.append(transport)
        return tuple(result)

    async def _request_transport(
        self,
        method: str,
        path: str,
        transport: tuple[bool, int],
        *,
        json: dict[str, Any] | None,
        data: bytes | None,
        headers: dict[str, str] | None,
        expect_json: bool,
        timeout: ClientTimeout | None = None,
    ) -> dict[str, Any]:
        use_ssl, port = transport
        scheme = "https" if use_ssl else "http"
        ssl = self._verify_ssl if use_ssl else None
        async with self._session.request(
            method,
            f"{scheme}://{self._host}:{port}/api/v1{path}",
            headers={**self._headers, **(headers or {})},
            json=json,
            data=data,
            timeout=timeout or self._timeout,
            ssl=ssl,
            allow_redirects=False,
        ) as response:
            if response.status in (401, 403):
                raise MiniDisplayAuthError("Display rejected API credentials")
            if response.status >= 400:
                try:
                    payload = await response.json(content_type=None)
                    message = str(payload.get("message") or payload.get("error"))
                except (ValueError, TypeError):
                    message = await response.text()
                raise MiniDisplayRequestError(
                    response.status, message or f"Display returned HTTP {response.status}"
                )
            self._active_transport = transport
            if not expect_json or response.status == 204:
                return {}
            payload = await response.json(content_type=None)
            if not isinstance(payload, dict):
                raise MiniDisplayInvalidResponseError("Expected a JSON object")
            return payload

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        expect_json: bool = True,
        retry_transport: bool = True,
        timeout: ClientTimeout | None = None,
    ) -> dict[str, Any]:
        async with self._request_lock:
            last_error: ClientError | TimeoutError | None = None
            transports = self._transports()
            for transport in transports if retry_transport else transports[:1]:
                try:
                    return await self._request_transport(
                        method,
                        path,
                        transport,
                        json=json,
                        data=data,
                        headers=headers,
                        expect_json=expect_json,
                        timeout=timeout,
                    )
                except MiniDisplayApiError:
                    raise
                except (ClientError, TimeoutError) as err:
                    last_error = err
            raise MiniDisplayConnectionError(str(last_error)) from last_error

    async def _request_bytes(self, method: str, path: str) -> bytes:
        """Request a bounded binary response from the display."""
        async with self._request_lock:
            last_error: ClientError | TimeoutError | None = None
            for transport in self._transports():
                use_ssl, port = transport
                scheme = "https" if use_ssl else "http"
                try:
                    async with self._session.request(
                        method,
                        f"{scheme}://{self._host}:{port}/api/v1{path}",
                        headers=self._headers,
                        timeout=self._timeout,
                        ssl=self._verify_ssl if use_ssl else None,
                        allow_redirects=False,
                    ) as response:
                        if response.status in (401, 403):
                            raise MiniDisplayAuthError(
                                "Display rejected API credentials"
                            )
                        if response.status >= 400:
                            try:
                                payload = await response.json(content_type=None)
                                message = str(
                                    payload.get("message") or payload.get("error")
                                )
                            except (ValueError, TypeError):
                                message = await response.text()
                            raise MiniDisplayRequestError(
                                response.status,
                                message
                                or f"Display returned HTTP {response.status}",
                            )
                        content = bytearray()
                        async for chunk in response.content.iter_chunked(4096):
                            if (
                                len(content) + len(chunk)
                                > MAX_ENCODED_BYTES
                            ):
                                raise MiniDisplayInvalidResponseError(
                                    "Display image exceeds the supported size"
                                )
                            content.extend(chunk)
                        self._active_transport = transport
                        return bytes(content)
                except MiniDisplayApiError:
                    raise
                except (ClientError, TimeoutError) as err:
                    last_error = err
            raise MiniDisplayConnectionError(str(last_error)) from last_error

    async def async_get_info(self) -> DeviceInfo:
        payload = await self._request("GET", "/info")
        try:
            info = DeviceInfo(
                device_id=str(payload["deviceId"]),
                name=str(payload.get("name", "Home Assistant Mini-Display")),
                model=str(payload["model"]),
                firmware_version=str(payload["firmwareVersion"]),
                api_version=int(payload["apiVersion"]),
                width=int(payload["width"]),
                height=int(payload["height"]),
                capabilities=tuple(str(item) for item in payload.get("capabilities", [])),
            )
        except (KeyError, TypeError, ValueError) as err:
            raise MiniDisplayInvalidResponseError("Invalid /info response") from err
        if info.api_version != API_VERSION:
            raise MiniDisplayInvalidResponseError(
                f"Unsupported API version {info.api_version}; expected {API_VERSION}"
            )
        return info

    async def async_get_status(self) -> dict[str, Any]:
        return await self._request("GET", "/status")

    async def async_set_display(
        self,
        *,
        on: bool | None = None,
        brightness: int | None = None,
        pixel_shift: int | None = None,
        refresh_rate_hz: float | None = None,
        timezone: str | None = None,
        notification_position: str | None = None,
    ) -> None:
        body: dict[str, Any] = {}
        if on is not None:
            body["on"] = on
        if brightness is not None:
            body["brightness"] = max(0, min(100, brightness))
        if pixel_shift is not None:
            body["pixelShift"] = max(0, min(10, pixel_shift))
        if timezone is not None:
            body["timezone"] = timezone
        if notification_position is not None:
            body["notificationPosition"] = notification_position
        if refresh_rate_hz is not None:
            body["refreshRateHz"] = refresh_rate_hz
        await self._request("PUT", "/display", json=body, expect_json=False)
        if refresh_rate_hz is not None:
            self.data_limiter.set_rate(refresh_rate_hz)

    async def async_set_page(self, page_id: str) -> None:
        body = {"mode": "auto"} if page_id == "auto" else {"id": page_id}
        await self._request("POST", "/page", json=body, expect_json=False)

    async def async_notify(self, payload: dict[str, Any]) -> None:
        """Send once, outside sensor pacing and without duplicating on retries."""
        await self._request("POST", "/notifications", json=payload, expect_json=False, retry_transport=False)

    async def async_dismiss_notifications(self) -> None:
        await self._request("DELETE", "/notifications", expect_json=False)

    async def async_page_command(self, command: str) -> None:
        await self._request(
            "POST", "/page", json={"command": command}, expect_json=False
        )

    async def async_set_page_rotation(self, enabled: bool) -> None:
        await self._request(
            "POST", "/page",
            json={"mode": "auto" if enabled else "manual"}, expect_json=False
        )

    async def async_restart(self) -> None:
        await self._request("POST", "/restart", json={}, expect_json=False)

    async def async_put_dashboard(
        self, dashboard: dict[str, Any], *, render: bool = True
    ) -> None:
        body = json_module.dumps(
            dashboard, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        await self._request(
            "PUT",
            f"/dashboard?render={'true' if render else 'false'}",
            data=body,
            headers={"Content-Type": "application/json"},
            expect_json=False,
        )

    async def async_patch_values(
        self, values: dict[str, Any], *, render: bool = True
    ) -> None:
        batches = split_value_batches(values)
        for index, batch in enumerate(batches):
            async with self.data_limiter:
                await self._request(
                    "PATCH",
                    "/data",
                    json={
                        "values": batch,
                        "render": render and index == len(batches) - 1,
                    },
                    expect_json=False,
                )

    async def async_patch_history(self, series: dict[str, Any], *, render: bool = True) -> None:
        """One series per request keeps the ESP JSON allocation bounded."""
        for attempt in range(3):
            try:
                async with self.data_limiter:
                    await self._request("PATCH", "/data", json={"values": {}, "series": series, "render": render}, expect_json=False)
                return
            except MiniDisplayRequestError as err:
                if err.status != 503 or attempt == 2:
                    raise
                await asyncio.sleep(1)

    async def async_get_assets(self) -> dict[str, Any]:
        """Return image assets stored by the display."""
        return await self._request("GET", "/assets")

    async def async_get_asset(self, asset_id: str) -> bytes:
        """Download one display-ready image asset."""
        return await self._request_bytes("GET", f"/assets?id={asset_id}")

    async def async_get_data(self) -> dict[str, Any]:
        """Return current values and bounded history retained by the display."""
        return await self._request("GET", "/data")

    async def async_put_asset(self, asset_id: str, content: bytes) -> None:
        """Atomically upload one display-ready image asset."""
        try:
            await self._async_put_asset_stream(asset_id, content)
            return
        except MiniDisplayRequestError as err:
            if err.status not in (404, 405):
                raise
        chunk_size = 4096
        for offset in range(0, len(content), chunk_size):
            await self._request(
                "PUT",
                f"/assets?id={asset_id}&offset={offset}&total={len(content)}",
                data=content[offset : offset + chunk_size],
                headers={"Content-Type": "application/octet-stream"},
                expect_json=False,
                timeout=self._asset_timeout
                if offset + chunk_size >= len(content)
                else None,
            )

    async def _async_put_asset_stream(self, asset_id: str, content: bytes) -> None:
        """Upload an asset in one bounded multipart stream."""
        async with self._request_lock:
            last_error: ClientError | TimeoutError | None = None
            for use_ssl, port in self._transports():
                scheme = "https" if use_ssl else "http"
                form = FormData()
                form.add_field(
                    "file",
                    content,
                    filename=f"{asset_id}.mdi",
                    content_type="application/octet-stream",
                )
                try:
                    async with self._session.post(
                        f"{scheme}://{self._host}:{port}/api/v1/assets/upload"
                        f"?id={asset_id}&total={len(content)}",
                        headers=self._headers,
                        data=form,
                        timeout=self._asset_timeout,
                        ssl=self._verify_ssl if use_ssl else None,
                        allow_redirects=False,
                    ) as response:
                        if response.status in (401, 403):
                            raise MiniDisplayAuthError(
                                "Display rejected API credentials"
                            )
                        if response.status >= 400:
                            try:
                                payload = await response.json(content_type=None)
                                message = str(
                                    payload.get("message") or payload.get("error")
                                )
                            except (ValueError, TypeError):
                                message = await response.text()
                            raise MiniDisplayRequestError(
                                response.status,
                                message
                                or f"Display returned HTTP {response.status}",
                            )
                        self._active_transport = (use_ssl, port)
                        return
                except MiniDisplayApiError:
                    raise
                except (ClientError, TimeoutError) as err:
                    last_error = err
            raise MiniDisplayConnectionError(str(last_error)) from last_error

    async def async_delete_asset(self, asset_id: str) -> None:
        """Delete one image asset from the display."""
        await self._request(
            "DELETE", f"/assets?id={asset_id}", expect_json=False
        )
