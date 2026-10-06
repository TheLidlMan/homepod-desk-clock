# Home Assistant integration

Install through HACS as a custom **Integration** repository, or copy
`custom_components/mini_display` into HA's `config/custom_components/`.
Restart HA and add **Home Assistant Mini-Display** under **Devices & services**.

The administrator-only **Mini Displays** sidebar panel manages multiple displays,
scenes, pages, images and temporary live previews. It supports row and free
layouts, independent text frames, appearance controls and conditional visibility.

The integration sends layouts and entity updates over the local device API,
fetches weather forecasts and supplies Recorder-backed graph history. Device
entities expose controls, configuration and diagnostics. No MQTT broker required.

Editor source: `integration/card/`. Run `npm ci --prefix integration/card`, then
`make card-check card-build` from the repository root.
