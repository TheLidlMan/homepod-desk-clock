"""Notification actions tested in an isolated Home Assistant runtime."""

from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
import voluptuous as vol

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from custom_components.mini_display import notification as module
from custom_components.mini_display.api import MiniDisplayClient, MiniDisplayConnectionError, MiniDisplayRequestError
from custom_components.mini_display.button import MiniDisplayDismissNotificationsButton


class NotificationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.hass = HomeAssistant(self.directory.name)
        self.coordinator = SimpleNamespace(
            data={"notificationPosition": "bottom", "notificationPositions": ["top", "bottom"]},
            client=SimpleNamespace(async_notify=AsyncMock(), async_dismiss_notifications=AsyncMock(),
                                   async_set_display=AsyncMock()),
            async_request_refresh=AsyncMock(),
            entry=SimpleNamespace(unique_id="test"),
            last_update_success=True,
        )
        self.hass.data[module.DOMAIN] = {"display-entry": {"coordinator": self.coordinator}}
        self.registry = patch.object(module.dr, "async_get", return_value=SimpleNamespace(
            async_get=lambda device_id: SimpleNamespace(config_entries={"display-entry"}) if device_id == "display" else None))
        self.registry.start()
        module.async_register_notification_services(self.hass)

    async def asyncTearDown(self):
        self.registry.stop()
        await self.hass.async_stop()
        self.directory.cleanup()

    async def call(self, action="notify", **data):
        await self.hass.services.async_call(module.DOMAIN, action, {"device_id": "display", **data}, blocking=True)

    async def test_defaults_and_payload(self):
        await self.call(message="Charging finished")
        self.coordinator.client.async_notify.assert_awaited_once_with({
            "message": "Charging finished", "title": "", "durationSeconds": 8,
            "severity": "info", "icon": "auto",
        })
        await self.call(title="Door", icon="door", severity="warning", duration=30, position="top")
        self.assertEqual(self.coordinator.client.async_notify.call_args.args[0]["position"], "top")
        self.assertEqual(self.coordinator.client.async_notify.call_args.args[0]["durationSeconds"], 30)

    async def test_rejects_unsupported_position_and_unloaded_display(self):
        with self.assertRaises(ServiceValidationError):
            await self.call(message="Test", position="left")
        self.hass.data[module.DOMAIN].clear()
        with self.assertRaises(ServiceValidationError):
            await self.call(message="Test")
        self.assertTrue(self.hass.services.has_service(module.DOMAIN, "notify"))
        self.coordinator.client.async_notify.assert_not_awaited()

    async def test_queue_error_not_retried_and_dismiss(self):
        self.coordinator.client.async_notify.side_effect = MiniDisplayRequestError(429, "Notification queue is full")
        with self.assertRaisesRegex(HomeAssistantError, "queue is full"):
            await self.call(message="Test")
        self.coordinator.client.async_notify.assert_awaited_once()
        await self.call("dismiss_notifications")
        self.coordinator.client.async_dismiss_notifications.assert_awaited_once()

    async def test_select_advertised_options_only(self):
        select = module.MiniDisplayNotificationPositionSelect(self.coordinator)
        self.assertEqual(select.options, ["top", "bottom"])
        self.assertEqual(select.current_option, "bottom")
        await select.async_select_option("top")
        self.coordinator.client.async_set_display.assert_awaited_once_with(notification_position="top")
        with self.assertRaises(ServiceValidationError):
            await select.async_select_option("right")
        self.coordinator.data = {}
        self.assertFalse(select.available)

    async def test_dismiss_button(self):
        button = MiniDisplayDismissNotificationsButton(self.coordinator)
        self.assertTrue(button.available)
        await button.async_press()
        self.coordinator.client.async_dismiss_notifications.assert_awaited_once()
        self.coordinator.async_request_refresh.assert_awaited_once()
        self.coordinator.data = {}
        self.assertFalse(button.available)

    async def test_no_duplicate_after_transport_timeout(self):
        client = MiniDisplayClient(AsyncMock(), "unused.invalid", "", 80)
        client.data_limiter.set_rate(0.1)
        client._request_transport = AsyncMock(side_effect=TimeoutError())
        with patch.object(client, "_transports", return_value=((False, 80), (True, 443))):
            with self.assertRaises(MiniDisplayConnectionError):
                await client.async_notify({"message": "Test"})
        client._request_transport.assert_awaited_once()

    async def test_dashboard_uses_compact_utf8_wire_json(self):
        client = MiniDisplayClient(AsyncMock(), "unused.invalid", "", 80)
        client._request = AsyncMock()

        await client.async_put_dashboard({"title": "Łódź", "pages": []})

        client._request.assert_awaited_once_with(
            "PUT",
            "/dashboard?render=true",
            data='{"title":"Łódź","pages":[]}'.encode(),
            headers={"Content-Type": "application/json"},
            expect_json=False,
        )

    def test_validation(self):
        schema = module.NOTIFY_SCHEMA
        for fields in ({}, {"message": "  "}, {"title": "ą" * 49}, {"message": "x" * 385},
                       {"message": "x", "duration": True}, {"message": "x", "duration": 1.5},
                       {"message": "x", "duration": 301}, {"message": "\x00"}, {"message": "\ud800"},
                       {"message": "x", "severity": "urgent"}, {"message": "x", "icon": "url"}):
            with self.assertRaises(vol.Invalid, msg=str(fields)):
                schema({"device_id": "display", **fields})
        self.assertEqual(schema({"device_id": "display", "title": "Ładowanie"})["duration"], 8)


if __name__ == "__main__":
    unittest.main()
