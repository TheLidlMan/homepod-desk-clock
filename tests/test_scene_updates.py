"""Protect the firmware update paths from reverting to direct drawing/parsing."""
from pathlib import Path
import unittest


class SceneUpdateTests(unittest.TestCase):
    def test_large_render_objects_are_not_on_loop_stack(self):
        source = (Path(__file__).parents[1] / "firmware/src/main.cpp").read_text()
        self.assertIn("std::unique_ptr<PageTransitionRenderer> renderer(", source)
        self.assertIn("std::unique_ptr<SceneUpdatePainter> painter(", source)
        image = (Path(__file__).parents[1] / "firmware/src/ImageAssets.h").read_text()
        self.assertNotIn("uint16_t line[240]", image)
        self.assertIn("cache->rowPixels()", image)

    def setUp(self):
        self.source = (Path(__file__).parents[1] / "firmware/src/main.cpp").read_text()

    def test_old_and_new_bounds_are_invalidated(self):
        body = self.source.split(
            "bool renderDashboardPage(const uint32_t *changedValues, bool clear) {", 1
        )[1].split("\nvoid registerDashboardMarquees", 1)[0]
        before, after = body.split("if (!compileScenePage(page, *activeScene))", 1)
        call = "invalidateChangedSceneSources(*activeScene, *changedValues)"
        self.assertIn(call, before)
        self.assertIn(call, after)
        self.assertNotIn("DashboardPageLoader loader", body)

    def test_upload_evicts_cache_before_validation(self):
        body = self.source.split("void receiveApiDashboard() {", 1)[1].split(
            "\nvoid receiveApiData", 1)[0]
        self.assertLess(body.index("pageDefinition.clear()"), body.index("loadDashboardMetadata"))

    def test_notification_animation_preserves_wifi_heap(self):
        body = self.source.split("void updateNotifications() {", 1)[1].split(
            "\nbool renderDashboardPage()", 1
        )[0]
        self.assertIn("ESP.getFreeHeap() >= 20 * 1024", body)
        self.assertIn("ESP.getMaxFreeBlockSize() >= 8 * 1024", body)


if __name__ == "__main__":
    unittest.main()
