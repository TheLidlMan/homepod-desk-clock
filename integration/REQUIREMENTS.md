# Home Assistant Mini-Display integration requirements

## 1. Purpose

The project provides one installable Home Assistant package containing:

- a custom integration named `mini_display`;
- an administrator-only Home Assistant custom panel named `Mini Displays`;
- a visual editor for dashboards rendered by a physical MiniDisplay display;
- entities for display control and diagnostics.

The package must not require MQTT. Home Assistant communicates directly with
the display over the local network.

## 2. Source of truth

`../../dashboard/dashboard.schema.json` is the canonical dashboard format.
The integration, frontend editor, API client, tests, and firmware must use that
format. They must not introduce a second page, row, or card model.

The schema is semantic. Dashboard configuration must not contain pixel
coordinates or dimensions. Firmware calculates geometry from page rows, row
weights, optional titles, and the number of cards in each row.

Home Assistant entity IDs are stored in card `source` fields. The backend reads
those fields and subscribes to the referenced states.

## 3. Components

### 3.1 Home Assistant backend

The backend must:

- discover displays through Zeroconf/mDNS service `_mini-display._tcp.local.`;
- also allow manual setup using a host name or IP address;
- create exactly one config entry per stable device ID;
- verify device identity and API compatibility before creating an entry;
- store host, API authentication material, and the last accepted dashboard;
- validate dashboards against schema version 1 before sending them;
- subscribe only to Home Assistant entities referenced by active dashboard
  `source` fields;
- send an initial state snapshot after setup and after every dashboard change;
- send subsequent state changes in bounded batches;
- expose WebSocket commands used by the management panel;
- make connection failures visible without blocking Home Assistant startup;
- preserve the last valid dashboard when a new configuration is invalid.

### 3.2 Management panel and editor

The bundled frontend must register:

- `mini-display-panel` as a Home Assistant custom panel;
- `mini-display-editor` inside that panel;
- an administrator-only `Mini Displays` sidebar entry at `/mini-display`.

The physical dashboard remains stored by the integration. The panel lists all
MiniDisplay config entries and retrieves or updates the selected display through
authenticated Home Assistant WebSocket commands. No Lovelace card or dashboard
resource is required.

The editor must eventually support:

- selecting one configured MiniDisplay display;
- adding, deleting, duplicating, enabling, disabling, and ordering pages;
- setting page `durationSeconds`;
- adding, deleting, duplicating, and ordering rows;
- optional row titles and row weights;
- one to three cards per row;
- selecting Home Assistant entities for `source` using HA selectors;
- editing every field allowed by schema version 1;
- a 240x240 live preview using the same layout rules as firmware;
- client-side validation plus authoritative backend validation;
- an explicit **Apply to display** action;
- clear errors identifying the page, row, card, and invalid field.

The panel must remain usable on desktop and mobile Home Assistant clients. The
240x240 preview may use a sticky side column on wide screens and move above the
editor on narrow screens.

### 3.3 Display firmware API

The display must expose an authenticated HTTP API on its LAN address. Version 1
uses JSON unless a binary endpoint explicitly says otherwise.

Required endpoints:

```text
GET  /api/v1/info
GET  /api/v1/status
GET  /api/v1/screenshot
GET  /api/v1/dashboard
PUT  /api/v1/dashboard
PATCH /api/v1/data
PUT  /api/v1/display
POST /api/v1/page
POST /api/v1/restart
```

`GET /api/v1/info` response:

```json
{
  "deviceId": "sdpro-a1b2c3",
  "name": "MiniDisplay",
  "model": "JUZIPi SD PRO",
  "firmwareVersion": "0.3.0",
  "apiVersion": 1,
  "width": 240,
  "height": 240,
  "capabilities": ["dashboard-v1", "brightness", "page-control"]
}
```

`GET /api/v1/status` response:

```json
{
  "connected": true,
  "displayOn": true,
  "brightness": 80,
  "page": "overview",
  "rotation": "auto",
  "uptimeSeconds": 1234,
  "freeHeapBytes": 24192,
  "wifiRssiDbm": -54,
  "dashboardRevision": "sha256-prefix"
}
```

`GET /api/v1/screenshot` returns a 240x240, 24-bit BMP containing the exact
completed frame currently visible on the display. Capture waits behind active
page transitions and freezes loop-driven animation updates while pixels are
read. The endpoint uses the same authentication as the rest of the device API.

`PUT /api/v1/dashboard` accepts one complete document conforming to
`dashboard.schema.json`. Success returns status 204. Firmware must validate the
document before replacing its active dashboard and commit it atomically.

`PATCH /api/v1/data` accepts partial source updates:

```json
{
  "values": {
    "sensor.living_room_temperature": {
      "state": "22.4",
      "available": true,
      "lastChanged": "2026-08-31T12:00:00Z"
    }
  }
}
```

Values use strings to preserve Home Assistant state semantics. Number cards
parse numeric strings according to a strict locale-independent format.

`PUT /api/v1/display` accepts optional `on` and `brightness` fields.

`POST /api/v1/page` accepts either `{"id":"overview"}` or
`{"mode":"auto"}`. Auto mode follows page order and `durationSeconds`.

All mutating endpoints must reject unsupported fields and return structured
errors:

```json
{
  "error": "invalid_dashboard",
  "message": "minimum is required when progress is bar",
  "path": "/pages/0/rows/1/cards/0/minimum"
}
```

## 4. Transport and update rules

- Home Assistant initiates all normal connections to the display.
- The display never needs Home Assistant credentials or a long-lived token.
- Status polling initially runs every 30 seconds while available and uses
  bounded backoff while unavailable.
- Entity changes should be coalesced for 100-500 ms before transmission.
- A data request must stay below a firmware-defined payload limit. The backend
  splits larger batches.
- The complete dashboard is sent only after configuration changes, explicit
  reload, or revision mismatch.
- The display stores the dashboard and latest values locally and continues to
  render while Home Assistant is unavailable.
- Requests use short connect and response timeouts and must never block HA's
  event loop.

## 5. Authentication and network security

- Version 1 uses a random per-device API token generated during provisioning.
- The user enters the token during manual setup or confirms a discovered device
  using a short pairing code shown on the display.
- Tokens are stored in config entry data, never dashboard JSON or logs.
- Every mutating endpoint requires authentication.
- Read endpoints should require authentication after pairing as well.
- Authentication failures trigger reauthentication, not automatic entry
  deletion.
- The integration assumes a trusted local network but must not silently fall
  back to unauthenticated HTTP.
- A future HTTPS transport may be added without changing dashboard schema.

## 6. Home Assistant device and entities

Each config entry creates one HA device with manufacturer `MiniDisplay`, model,
firmware version, and network connection information.

Required entities:

- `light`: display power and brightness;
- `select`: active page plus `Auto`;
- `button`: next page;
- `button`: previous page;
- `button`: reload dashboard;
- `button`: restart device;
- `sensor`: current page;
- `sensor`: Wi-Fi RSSI;
- `sensor`: uptime;
- `sensor`: free heap;
- `sensor`: firmware version;
- `sensor`: last successful synchronization;
- `binary_sensor`: connectivity.

Diagnostic entities should be disabled by default where Home Assistant
conventions recommend it. Device unavailability must propagate consistently to
all entities.

## 7. Discovery and setup

Firmware advertises:

```text
service: _mini-display._tcp.local.
port: 80
TXT api=1
TXT id=sdpro-a1b2c3
TXT model=sd-pro
```

The config flow must support:

1. Zeroconf discovery and confirmation.
2. Manual host entry.
3. Pairing/authentication.
4. Duplicate-device prevention using `deviceId`.
5. Reauthentication after token change.
6. Reconfiguration when the host changes.

## 8. Dashboard persistence

The integration stores the last accepted dashboard in a dedicated versioned HA
Store keyed by config entry ID. Config entry `data` contains connection and
authentication data only.

Dashboard writes follow this order:

1. Validate against JSON Schema.
2. Validate firmware-specific resource limits.
3. Send to display.
4. Verify returned revision or fetch status.
5. Persist only after device acceptance.
6. Notify the frontend and refresh entity subscriptions.

An unavailable display may accept a staged configuration only when the editor
clearly marks it as pending. Version 1 may reject writes while offline instead.

## 9. Firmware resource constraints

- Maximum dashboard HTTP body: initially 12 KiB.
- Maximum pages: 16.
- Maximum rows per page: 6.
- Maximum cards per row: 3.
- No full-screen framebuffer is required.
- JSON parsing uses bounded allocation and rejects oversized documents before
  parsing.
- Dashboard replacement uses a temporary file and atomic rename in LittleFS.
- Last known values have a fixed count and maximum string length.
- Rendering and HTTP handlers must yield often enough to feed the ESP8266
  watchdog.

## 10. Frontend distribution

The integration serves its built JavaScript from a local HA static path and
registers it through `panel_custom`. Loading must be tested on cold browser
sessions. The package removes any Lovelace resource left by versions that
shipped the editor as a card.

The package is delivered as one HACS integration repository. Users must not
copy JavaScript files manually.

## 11. Error handling

The system must distinguish:

- device unavailable;
- request timeout;
- authentication failure;
- unsupported API version;
- invalid dashboard schema;
- firmware resource limit exceeded;
- missing Home Assistant entity;
- `unknown` or `unavailable` entity state;
- dashboard revision mismatch;
- partial data update failure.

One invalid or unavailable source must not stop updates for other cards.

## 12. Testing

Backend tests must cover:

- config flow discovery and manual setup;
- duplicate prevention;
- API authentication and timeout errors;
- coordinator availability transitions;
- entity state mapping;
- dashboard schema validation;
- extraction and subscription of `source` fields;
- batching and serialization of state changes;
- dashboard persistence and rollback.

Frontend tests must cover:

- custom panel registration;
- device selection;
- WebSocket loading and saving;
- page rotation fields;
- one, two, and three cards per row;
- one to six rows and row weights;
- missing/unavailable entities;
- exact 240x240 preview geometry;
- light and dark HA themes.

Contract tests must run the same dashboard fixtures against integration and
firmware validators.

## 13. Delivery stages

1. Integration skeleton, manual config flow, HTTP client, and diagnostics.
2. Firmware API v1 with authentication, info, status, display, and page calls.
3. Dashboard upload, persistence, and schema validation.
4. Entity-source subscriptions and partial data updates.
5. Bundled management panel with device selection and read-only preview.
6. Full visual page/row/card editor.
7. Zeroconf discovery and pairing flow.
8. HACS packaging, migrations, tests, and documentation.

## 14. Acceptance criteria

- Installation requires no MQTT broker.
- A display can be added through HA UI and appears as one device.
- Display power, brightness, page selection, and buttons work through entities.
- The bundled panel appears in the sidebar without copying files.
- The panel can select every configured MiniDisplay config entry.
- The editor reads and writes documents conforming to the canonical schema.
- HA automatically forwards referenced entity changes to the display.
- The display continues showing its last dashboard while HA is offline.
- Invalid configuration never replaces the last working dashboard.
- Restart and OTA recovery paths remain available.
