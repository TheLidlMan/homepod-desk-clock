"""Exercise the switch without importing the full HA runtime."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock


class Entity:
    def __init__(self, coordinator, key):
        self.coordinator = coordinator
        self.key = key


source = Path(__file__).parents[1] / "custom_components/mini_display/switch.py"
tree = ast.parse(source.read_text())
node = next(item for item in tree.body
            if isinstance(item, ast.ClassDef)
            and item.name == "MiniDisplayAutomaticPagesSwitch")
namespace = {"MiniDisplayEntity": Entity, "SwitchEntity": type("SwitchEntity", (), {})}
exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), "exec"), namespace)
Switch = namespace[node.name]


class RotationTests(unittest.IsolatedAsyncioTestCase):
    async def test_state_comes_from_device_and_commands_refresh(self):
        coordinator = SimpleNamespace(
            data={"rotation": "auto"},
            client=SimpleNamespace(async_set_page_rotation=AsyncMock()),
            async_request_refresh=AsyncMock(),
        )
        switch = Switch(coordinator)
        self.assertTrue(switch.is_on)
        coordinator.data = {"rotation": "manual"}
        self.assertFalse(switch.is_on)
        coordinator.data = {}
        self.assertIsNone(switch.is_on)
        await switch.async_turn_on()
        coordinator.client.async_set_page_rotation.assert_awaited_with(True)
        await switch.async_turn_off()
        coordinator.client.async_set_page_rotation.assert_awaited_with(False)
        self.assertEqual(coordinator.async_request_refresh.await_count, 2)


if __name__ == "__main__":
    unittest.main()
