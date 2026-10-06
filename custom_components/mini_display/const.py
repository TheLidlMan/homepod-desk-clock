"""Constants for the MiniDisplay integration."""

from __future__ import annotations

from pathlib import Path

DOMAIN = "mini_display"
FEATURE_TLS = False
PLATFORMS = [
    "binary_sensor",
    "light",
    "number",
    "button",
    "select",
    "sensor",
    "switch",
]

CONF_API_TOKEN = "api_token"
CONF_DATA_BATCH_INTERVAL = "data_batch_interval"
CONF_DEVICE_ID = "device_id"
CONF_USE_SSL = "use_ssl"
CONF_VERIFY_SSL = "verify_ssl"

API_VERSION = 1
DEFAULT_NAME = "Home Assistant Mini-Display"
DEFAULT_PORT = 80
DEFAULT_HTTPS_PORT = 443
DEFAULT_DATA_BATCH_INTERVAL_SECONDS = 1.0
DEFAULT_SCAN_INTERVAL_SECONDS = 30
REQUEST_TIMEOUT_SECONDS = 5

FRONTEND_DIR = Path(__file__).parent / "frontend"
FRONTEND_URL = "/mini_display/frontend/mini-display-panel.js"
LEGACY_FRONTEND_URL = "/mini_display/frontend/mini-display-dashboard-card.js"
PANEL_URL_PATH = "mini-display"
PANEL_WEB_COMPONENT = "mini-display-panel"
SIGNAL_SCENES_UPDATED = f"{DOMAIN}_scenes_updated"

TIMEZONE_OPTIONS = {
    "Europe/Warsaw": "CET-1CEST,M3.5.0,M10.5.0/3",
    "UTC": "UTC0",
    "Europe/London": "GMT0BST,M3.5.0/1,M10.5.0",
    "America/New York": "EST5EDT,M3.2.0/2,M11.1.0/2",
    "America/Los Angeles": "PST8PDT,M3.2.0/2,M11.1.0/2",
    "Asia/Tokyo": "JST-9",
    "Australia/Sydney": "AEST-10AEDT,M10.1.0,M4.1.0/3",
}
