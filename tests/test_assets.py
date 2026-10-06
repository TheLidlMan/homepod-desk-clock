"""Image library synchronization tests; run in a Home Assistant environment."""

import base64
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from custom_components.mini_display import assets as module
from custom_components.mini_display import dashboard as dashboard_module
from custom_components.mini_display.image_codec import encode_rgb565


def mdi(width: int = 2, height: int = 1) -> bytes:
    """Return a tiny red and green RGB565 image."""
    pixels = (b"\x00\xf8\xe0\x07" * (width * height // 2 + 1))[: width * height * 2]
    return encode_rgb565(width, height, pixels)


def animated_mdi() -> bytes:
    """Return two tiny animated frames."""
    payloads = [mdi(1, 1)[8:], encode_rgb565(1, 1, b"\x1f\x00")[8:]]
    header = bytearray(b"MDA1\x01\x00\x01\x00\x02\x00\x00\x00")
    header.extend((300).to_bytes(4, "little"))
    offset = 36
    for duration, payload in zip((100, 200), payloads, strict=True):
        header.extend(duration.to_bytes(2, "little"))
        header.extend(offset.to_bytes(4, "little"))
        header.extend(len(payload).to_bytes(4, "little"))
        offset += len(payload)
    return bytes(header) + b"".join(payloads)


class AssetTests(unittest.IsolatedAsyncioTestCase):
    def manager(self):
        manager = module.MiniDisplayAssetManager.__new__(module.MiniDisplayAssetManager)
        manager._store = AsyncMock()
        manager._client = AsyncMock()
        manager._assets = {}
        manager._import_complete = False
        return manager

    async def test_first_load_imports_display_images(self):
        manager = self.manager()
        content = mdi()
        manager._store.async_load.return_value = None
        manager._client.async_get_assets.return_value = {
            "assets": [{"id": "0123456789abcdef", "width": 2, "height": 1}]
        }
        manager._client.async_get_asset.return_value = content

        await manager.async_load()

        asset = manager._assets["0123456789abcdef"]
        self.assertEqual(base64.b64decode(asset["data"]), content)
        self.assertTrue(asset["preview"].startswith("data:image/png;base64,"))
        manager._store.async_save.assert_awaited_once()

    async def test_put_preserves_animated_metadata(self):
        manager = self.manager()
        content = animated_mdi()

        asset = await manager.async_put(
            "0123456789abcdef",
            "Status.gif",
            1,
            1,
            base64.b64encode(content).decode(),
            "data:image/webp;base64,preview",
        )

        self.assertTrue(asset["animated"])
        self.assertEqual(asset["frameCount"], 2)
        self.assertEqual(asset["durationMs"], 300)
        manager._client.async_put_asset.assert_awaited_once_with(
            "0123456789abcdef", module.upgrade_animated_image(content)
        )

    async def test_existing_library_is_not_reimported(self):
        manager = self.manager()
        content = mdi()
        manager._store.async_load.return_value = {
            "importComplete": True,
            "assets": [
                {
                    "id": "0123456789abcdef",
                    "name": "Existing",
                    "width": 2,
                    "height": 1,
                    "bytes": len(content),
                    "data": base64.b64encode(content).decode(),
                    "preview": "",
                }
            ]
        }

        await manager.async_load()

        manager._client.async_get_assets.assert_not_awaited()

    async def test_sync_uploads_missing_and_prunes_extra(self):
        manager = self.manager()
        content = mdi()
        manager._assets = {
            "0123456789abcdef": {
                "bytes": len(content),
                "data": base64.b64encode(content).decode(),
            }
        }
        manager._client.async_get_assets.return_value = {
            "assets": [{"id": "fedcba9876543210"}]
        }

        remote = await manager.async_sync({"0123456789abcdef"})
        await manager.async_prune({"0123456789abcdef"}, remote)

        manager._client.async_put_asset.assert_awaited_once_with(
            "0123456789abcdef", content
        )
        manager._client.async_delete_asset.assert_awaited_once_with(
            "fedcba9876543210"
        )

    async def test_dashboard_prunes_only_after_it_is_accepted(self):
        manager = dashboard_module.MiniDisplayDashboardManager.__new__(
            dashboard_module.MiniDisplayDashboardManager
        )
        manager.hass = SimpleNamespace(states={})
        manager.weather = SimpleNamespace(values=AsyncMock(return_value={}))
        manager._last_rendered_dashboard = None
        manager.assets = SimpleNamespace(
            async_stage=AsyncMock(
                return_value=module.AssetSyncTransaction(
                    {"0123456789abcdef", "unused0000000000"},
                    {"unused0000000000"},
                    True,
                )
            ),
            async_prune=AsyncMock(),
            async_rollback=AsyncMock(),
        )
        manager.client = SimpleNamespace(
            async_patch_values=AsyncMock(),
            async_put_dashboard=AsyncMock(),
            async_set_page=AsyncMock(),
        )
        manager._async_send_history = AsyncMock()
        document = {
            "version": 1,
            "pages": [
                {
                    "id": "page",
                    "rows": [
                        {
                            "cards": [
                                {"type": "image", "image": "0123456789abcdef"}
                            ]
                        }
                    ],
                }
            ],
        }

        await manager._async_send_dashboard(document)

        manager.client.async_put_dashboard.assert_awaited_once()
        manager.assets.async_prune.assert_awaited_once_with(
            {"0123456789abcdef"},
            {"0123456789abcdef", "unused0000000000"},
        )

        manager.assets.async_prune.reset_mock()
        manager.client.async_put_dashboard.side_effect = RuntimeError("rejected")
        with self.assertRaises(RuntimeError):
            await manager._async_send_dashboard(document)
        manager.assets.async_prune.assert_not_awaited()
        manager.assets.async_rollback.assert_awaited_once()

    async def test_stage_reclaims_old_image_before_large_replacement(self):
        manager = self.manager()
        old = mdi(40, 20)
        new = mdi(60, 20)
        manager._assets = {
            "aaaaaaaaaaaaaaaa": {
                "bytes": len(old),
                "data": base64.b64encode(old).decode(),
            },
            "bbbbbbbbbbbbbbbb": {
                "bytes": len(new),
                "data": base64.b64encode(new).decode(),
            },
        }
        manager._client.async_get_assets.return_value = {
            "assets": [{"id": "aaaaaaaaaaaaaaaa", "bytes": len(old)}],
            "freeBytes": len(new) - 1,
            "reserveBytes": 0,
        }

        transaction = await manager.async_stage(
            {"bbbbbbbbbbbbbbbb"}, {"aaaaaaaaaaaaaaaa"}
        )

        manager._client.async_delete_asset.assert_awaited_once_with(
            "aaaaaaaaaaaaaaaa"
        )
        manager._client.async_put_asset.assert_awaited_once_with(
            "bbbbbbbbbbbbbbbb", new
        )
        self.assertTrue(transaction.reclaimed)
        self.assertEqual(transaction.remote_ids, {"bbbbbbbbbbbbbbbb"})


if __name__ == "__main__":
    unittest.main()
