"""Persistent display-ready image assets."""

from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
import logging
import re
import struct
import zlib
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .api import MiniDisplayApiError, MiniDisplayClient, MiniDisplayRequestError
from .image_codec import (
    ImageCodecError,
    decode_rgb565,
    inspect_image,
    upgrade_animated_image,
    validate_image,
)

STORE_VERSION = 1
STORE_KEY_PREFIX = "mini_display.assets"
ASSET_ID_PATTERN = re.compile(r"^[a-f0-9]{16}$")
MAX_ASSETS = 24
MAX_ASSET_BYTES = 768 * 1024
PREVIEW_MAX_DIMENSION = 120

_LOGGER = logging.getLogger(__name__)


class AssetValidationError(ValueError):
    """An image asset is invalid."""


@dataclass(frozen=True, slots=True)
class AssetSyncTransaction:
    """Remote image state retained for rollback until dashboard activation."""

    remote_ids: set[str]
    original_ids: set[str]
    reclaimed: bool = False


class MiniDisplayAssetManager:
    """Store optimized images in HA and synchronize them to one display."""

    def __init__(
        self, hass: HomeAssistant, entry_id: str, client: MiniDisplayClient
    ) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass, STORE_VERSION, f"{STORE_KEY_PREFIX}.{entry_id}"
        )
        self._client = client
        self._assets: dict[str, dict[str, Any]] = {}
        self._import_complete = False

    async def async_load(self) -> None:
        """Load persisted assets."""
        stored = await self._store.async_load()
        stored = stored or {}
        self._import_complete = stored.get("importComplete") is True
        raw_assets = stored.get("assets", [])
        if isinstance(raw_assets, list):
            self._assets = {
                item["id"]: item
                for item in raw_assets
                if isinstance(item, dict)
                and isinstance(item.get("id"), str)
                and ASSET_ID_PATTERN.fullmatch(item["id"])
                and isinstance(item.get("data"), str)
            }
        upgraded = False
        for asset in self._assets.values():
            try:
                content = base64.b64decode(asset["data"], validate=True)
                next_content = upgrade_animated_image(content)
            except (ValueError, TypeError, ImageCodecError):
                continue
            if next_content == content:
                continue
            asset["data"] = base64.b64encode(next_content).decode()
            asset["bytes"] = len(next_content)
            upgraded = True
        if upgraded:
            await self._async_save()
        if not self._import_complete:
            try:
                await self._async_import_from_display()
            except MiniDisplayApiError as err:
                _LOGGER.warning("Could not import images from Mini Display: %s", err)

    def list(self, *, include_data: bool = False) -> list[dict[str, Any]]:
        """Return asset metadata, optionally with previewable binary data."""
        result = []
        for asset in self._assets.values():
            item = {key: value for key, value in asset.items() if key != "data"}
            if include_data:
                item["data"] = asset["data"]
            result.append(item)
        return result

    async def async_put(
        self,
        asset_id: str,
        name: str,
        width: int,
        height: int,
        encoded: str,
        preview: str,
    ) -> dict[str, Any]:
        """Validate and persist one browser-optimized asset."""
        if not ASSET_ID_PATTERN.fullmatch(asset_id):
            raise AssetValidationError("Invalid asset id")
        if not 1 <= width <= 1024 or not 1 <= height <= 1024:
            raise AssetValidationError("Image dimensions must be 1-1024 pixels")
        try:
            content = base64.b64decode(encoded, validate=True)
        except (ValueError, TypeError) as err:
            raise AssetValidationError("Invalid image data") from err
        try:
            content = upgrade_animated_image(content)
        except ImageCodecError as err:
            raise AssetValidationError(str(err)) from err
        encoded = base64.b64encode(content).decode()
        header_width, header_height, _ = _decode_mdi(content)
        info = inspect_image(content)
        if header_width != width or header_height != height:
            raise AssetValidationError("Image metadata does not match payload")
        if len(self._assets) >= MAX_ASSETS and asset_id not in self._assets:
            raise AssetValidationError(f"A display can keep at most {MAX_ASSETS} images")
        asset = {
            "id": asset_id,
            "name": name.strip()[:80] or "Image",
            "width": width,
            "height": height,
            "bytes": len(content),
            "data": encoded,
            "preview": preview[:100000] if preview.startswith("data:image/") else "",
            "animated": info.animated,
            "frameCount": info.frame_count,
            "durationMs": info.duration_ms,
        }
        self._assets[asset_id] = asset
        await self._async_save()
        # Stage new content immediately. Save then only activates dashboard
        # metadata instead of transferring hundreds of kilobytes first.
        try:
            await self._client.async_put_asset(asset_id, content)
        except MiniDisplayApiError as err:
            _LOGGER.debug(
                "Mini Display image %s stored locally; device staging delayed: %s",
                asset_id,
                err,
            )
        return {key: value for key, value in asset.items() if key != "data"}

    async def async_delete(self, asset_id: str) -> None:
        """Delete an asset from HA and the physical display."""
        self._assets.pop(asset_id, None)
        await self._async_save()
        await self._client.async_delete_asset(asset_id)

    async def async_sync(self, asset_ids: set[str]) -> set[str]:
        """Upload missing referenced assets and return remote asset ids."""
        missing = asset_ids - self._assets.keys()
        if missing:
            raise AssetValidationError(
                f"Missing image asset: {sorted(missing)[0]}"
            )
        remote = await self._client.async_get_assets()
        remote_assets = {
            str(item.get("id")): item.get("bytes")
            for item in remote.get("assets", [])
            if isinstance(item, dict)
            and ASSET_ID_PATTERN.fullmatch(str(item.get("id", "")))
        }
        for asset_id in sorted(asset_ids):
            if remote_assets.get(asset_id) == self._assets[asset_id]["bytes"]:
                continue
            await self._client.async_put_asset(
                asset_id, base64.b64decode(self._assets[asset_id]["data"])
            )
            remote_assets[asset_id] = self._assets[asset_id]["bytes"]
        return set(remote_assets)

    async def async_stage(
        self, asset_ids: set[str], protected_ids: set[str]
    ) -> AssetSyncTransaction:
        """Stage required images, reclaiming obsolete images only when needed."""
        missing = asset_ids - self._assets.keys()
        if missing:
            raise AssetValidationError(
                f"Missing image asset: {sorted(missing)[0]}"
            )
        remote = await self._client.async_get_assets()
        remote_assets = {
            str(item.get("id")): int(item.get("bytes", 0))
            for item in remote.get("assets", [])
            if isinstance(item, dict)
            and ASSET_ID_PATTERN.fullmatch(str(item.get("id", "")))
        }
        original_ids = set(remote_assets)
        free_bytes = int(remote.get("freeBytes", 0))
        reserve_bytes = int(remote.get("reserveBytes", 0))
        upload_ids = [
            asset_id
            for asset_id in asset_ids
            if remote_assets.get(asset_id) != self._assets[asset_id]["bytes"]
        ]
        # Replacing an asset with the same id releases its old file after upload.
        upload_ids.sort(key=lambda asset_id: asset_id not in remote_assets)
        reclaimable = sorted(
            original_ids - asset_ids,
            key=lambda asset_id: (
                asset_id in protected_ids,
                -remote_assets.get(asset_id, 0),
            ),
        )
        reclaimed = False
        uploaded: set[str] = set()
        try:
            for asset_id in upload_ids:
                content = base64.b64decode(self._assets[asset_id]["data"])
                required_free = len(content) + reserve_bytes
                while free_bytes < required_free and reclaimable:
                    stale_id = reclaimable.pop(0)
                    await self._client.async_delete_asset(stale_id)
                    free_bytes += remote_assets.pop(stale_id, 0)
                    reclaimed = True
                if free_bytes < required_free:
                    raise MiniDisplayRequestError(
                        507, "Not enough space after safety reserve"
                    )
                previous_bytes = remote_assets.get(asset_id, 0)
                await self._client.async_put_asset(asset_id, content)
                remote_assets[asset_id] = len(content)
                free_bytes += previous_bytes - len(content)
                uploaded.add(asset_id)
        except MiniDisplayApiError:
            if reclaimed:
                await self._async_restore(original_ids, uploaded)
            raise
        return AssetSyncTransaction(set(remote_assets), original_ids, reclaimed)

    async def async_rollback(self, transaction: AssetSyncTransaction) -> None:
        """Restore images evicted while staging a rejected dashboard."""
        if transaction.reclaimed:
            await self._async_restore(transaction.original_ids, set())

    async def _async_restore(
        self, original_ids: set[str], uploaded_ids: set[str]
    ) -> None:
        """Best-effort restore of remote image state after a failed swap."""
        try:
            remote = await self._client.async_get_assets()
            remote_ids = {
                str(item.get("id"))
                for item in remote.get("assets", [])
                if isinstance(item, dict)
                and ASSET_ID_PATTERN.fullmatch(str(item.get("id", "")))
            }
            for asset_id in sorted((remote_ids - original_ids) | uploaded_ids):
                await self._client.async_delete_asset(asset_id)
            restorable = original_ids & self._assets.keys()
            await self.async_sync(restorable)
        except MiniDisplayApiError as err:
            _LOGGER.error(
                "Could not restore Mini Display images after failed swap: %s", err
            )

    async def async_prune(self, keep: set[str], remote_ids: set[str]) -> None:
        """Remove images not used by the dashboard currently on the display."""
        for asset_id in sorted(remote_ids - keep):
            try:
                await self._client.async_delete_asset(asset_id)
            except MiniDisplayApiError as err:
                _LOGGER.warning(
                    "Could not remove unused Mini Display image %s: %s",
                    asset_id,
                    err,
                )

    async def _async_import_from_display(self) -> None:
        """Seed a new HA image library from images already on the display."""
        remote = await self._client.async_get_assets()
        complete = True
        for item in remote.get("assets", []):
            if not isinstance(item, dict):
                complete = False
                continue
            asset_id = str(item.get("id", ""))
            if asset_id in self._assets:
                continue
            if (
                not ASSET_ID_PATTERN.fullmatch(asset_id)
                or len(self._assets) >= MAX_ASSETS
            ):
                complete = False
                continue
            try:
                content = await self._client.async_get_asset(asset_id)
                width, height, pixels = _decode_mdi(content)
                info = inspect_image(content)
            except (AssetValidationError, MiniDisplayApiError) as err:
                complete = False
                _LOGGER.warning(
                    "Could not import Mini Display image %s: %s", asset_id, err
                )
                continue
            if width != item.get("width") or height != item.get("height"):
                complete = False
                _LOGGER.warning(
                    "Could not import Mini Display image %s: metadata mismatch",
                    asset_id,
                )
                continue
            self._assets[asset_id] = {
                "id": asset_id,
                "name": f"Display image {asset_id[:8]}",
                "width": width,
                "height": height,
                "bytes": len(content),
                "data": base64.b64encode(content).decode(),
                "preview": _mdi_preview(pixels, width, height),
                "animated": info.animated,
                "frameCount": info.frame_count,
                "durationMs": info.duration_ms,
            }
        self._import_complete = complete
        await self._async_save()

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "importComplete": self._import_complete,
                "assets": list(self._assets.values()),
            }
        )


def _decode_mdi(content: bytes) -> tuple[int, int, bytes]:
    """Decode MDI2 while exposing integration-specific validation errors."""
    if len(content) > MAX_ASSET_BYTES:
        raise AssetValidationError("Optimized image is too large")
    try:
        validate_image(content)
        return decode_rgb565(content)
    except ImageCodecError as err:
        raise AssetValidationError(str(err)) from err


def _png_chunk(kind: bytes, payload: bytes) -> bytes:
    body = kind + payload
    return (
        struct.pack(">I", len(payload))
        + body
        + struct.pack(">I", binascii.crc32(body))
    )


def _mdi_preview(pixels: bytes, width: int, height: int) -> str:
    """Create a small browser preview without adding an image dependency to HA."""
    step = max(
        1,
        (max(width, height) + PREVIEW_MAX_DIMENSION - 1)
        // PREVIEW_MAX_DIMENSION,
    )
    preview_width = (width + step - 1) // step
    preview_height = (height + step - 1) // step
    rows = bytearray()
    for y in range(0, height, step):
        rows.append(0)
        for x in range(0, width, step):
            offset = (y * width + x) * 2
            color = pixels[offset] | (pixels[offset + 1] << 8)
            rows.extend(
                (
                    ((color >> 11) & 0x1F) * 255 // 31,
                    ((color >> 5) & 0x3F) * 255 // 63,
                    (color & 0x1F) * 255 // 31,
                )
            )
    signature = b"\x89PNG\r\n\x1a\n"
    png = b"".join(
        (
            signature,
            _png_chunk(
                b"IHDR",
                struct.pack(
                    ">IIBBBBB", preview_width, preview_height, 8, 2, 0, 0, 0
                ),
            ),
            _png_chunk(b"IDAT", zlib.compress(bytes(rows), 9)),
            _png_chunk(b"IEND", b""),
        )
    )
    return "data:image/png;base64," + base64.b64encode(png).decode()
