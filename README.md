# HomePod Desk Clock

A cheap JUZIPi SD PRO clock that shows the time, a quick weather forecast and
what your HomePod is playing. Metadata and album artwork run directly on the
ESP8266. Your Mac can be switched off. No iCloud login is required.

The clock fades to a music face when playback starts and returns to the clock
when paused. It has evenly spaced clock digits, smooth text, a rounded progress
bar without elapsed-time numbers, pixel shifting and scheduled night dimming.
Weather comes from Open-Meteo; music stays on your local network.

## Hardware and status

Tested target: **JUZIPi SD PRO, ESP8266/ESP-12F, 4 MB flash, 240×240 ST7789**.
This is an experimental project, built on
[Home Assistant MiniDisplay](https://github.com/piotrkochan/homeassistant-minidisplay).
Other GeekMagic/ESP32 products can have different chips, partitions and pins.
The SD PRO binary is not compatible with them.

Native playback, covers and automatic reconnect were exercised on a real
SD PRO and HomePod, including a forced connection failure. Host tests run with
AddressSanitizer/UndefinedBehaviorSanitizer. A later receiver failure exposed duplicate allocations for fragmented encrypted
messages; the receiver now reuses its existing frame buffer and accepts messages
that cross frame boundaries. Immediately drained receive records use a 2 KiB
temporary copy margin. Reads do not wait below 4 KiB and must restore that
normal margin before authentication or callbacks; pairing and frame assembly
keep a 4 KiB margin. A live
6,498-byte allocation rejection is covered by regression tests. A separate
hardware watchdog reset has no captured
stack or confirmed cause. RTC phase breadcrumbs now help diagnose a recurrence.
Transition image caches now release decoded rows and open files after painting,
including low-memory fallback paths, so covers cannot retain networking memory
or keep a replaced asset open between transitions. Host checks exercise 1,000
cache-release/replacement cycles. Multi-day reliability and power or temperature
measurements remain unverified.

## Build

Use Python 3.12, Node.js 22, a C/C++ compiler and Make.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-build.txt
npm --prefix firmware/web ci
cp firmware/src/ClockConfig.example.h firmware/src/ClockConfig.h
# Edit ClockConfig.h: HomePod address, weather location and night hours.
PATH="$PWD/.venv/bin:$PATH" make size FIRMWARE_VERSION=0.3.0-desk.3
PATH="$PWD/.venv/bin:$PATH" make test-native
```

The OTA image is `firmware/.pio/build/sdpro/firmware.bin`. Reserve the HomePod's
IP in your router. Configuration is compiled in for now; there is no HomePod
discovery/settings panel. `ClockConfig.h` is ignored by Git. It needs no passwords.
The example uses London weather and 23:00–07:00 night mode. Set the device's
timezone in its web panel so the clock and night schedule use your local time.

## Install

1. For a clock still running stock firmware, first follow the
   [upstream SD PRO bootstrap installation](https://github.com/piotrkochan/homeassistant-minidisplay#install-on-juzipi-sd-pro).
   **Do not upload this full image through the stock updater.** Keep the vendor
   recovery image and a serial recovery method available.
2. Provision Wi-Fi through the installer/recovery screen, then use the custom
   firmware's **Firmware** page to upload your newly built image.
3. Install the included dashboard, open fonts and divider using the clock's
   displayed address:

   ```sh
   python3 scripts/install_dashboard.py http://192.168.1.101
   ```

   This replaces the two custom font slots/dashboard and restarts once.
   If API authentication is enabled, supply its token using `CLOCK_API_TOKEN`
   in your environment. Do not put passwords in Git or command arguments.
4. In Apple's Home app, open **Home Settings → Speakers & TV**, and allow
   **Anyone On the Same Network**. The clock and HomePod must be able to reach
   each other on Wi-Fi. Home-members-only access is not supported by this client.
   This setting also permits other devices on that network to access speakers.

Pairing takes roughly 17 seconds on the tested device. Boot, reconnect and cover
retries can take longer. The observer reads playback state; it does not send
play, pause, volume or routing commands. It uses transient AirPlay pairing and
does not store an Apple account password or permanent pairing credentials.

## Display and memory limits

- Covers are requested at 80 pixels, then 64/48 on retries, and scaled to the
  display. Some detailed covers fall back to a generic record.
- JPEGs have a 7 KiB cap. Conversion uses a bounded 16-row stripe, not a full-frame
  buffer. Only the current cover and a generic cover are kept.
- Weather refreshes every 15 minutes. Rain text is an hourly forecast estimate,
  rather than Apple Weather's minute-by-minute forecast.
- Default day brightness is a device setting; night brightness defaults to 8%.
  Sleep Focus integration is not included.
- The firmware is close to the 1 MiB OTA limit. Run `make size` after changes.
- Pairing is cooperative but synchronous: the display/web panel can pause while
  authentication runs. There is no built-in temperature sensor evidence here.

Use this on a trusted LAN. The inherited web panel supports API authentication;
enable it in Settings if needed. Do not expose its HTTP/OTA endpoints to the
internet. Weather currently uses HTTP without credentials; a network attacker
could alter its forecast response. TLS weather fetching is not implemented.

## Fonts, tests and attribution

The redistributable packs use **Nunito** and **Inter** under SIL OFL 1.1, with
license files in `assets/fonts`. Clock digits have fixed advances and circular
colon dots. Apple/system fonts from the original personal prototype are not
included. To regenerate the packs from the upstream Google Fonts files:

```sh
.venv/bin/pip install Pillow==12.3.0
.venv/bin/python scripts/generate_fonts.py --clock-font Nunito.ttf --text-font Inter.ttf
```

Host coverage includes transport ownership/reconnect cycles, encrypted event
ordering, authenticated large continuations and cross-frame records, malformed
and stalled events, RTC reset breadcrumbs, image-cache lifetime/replacement,
clock/weather policy and inherited
renderer/configuration tests. `make web-check` checks the web UI; `make check`
runs schema checks and PlatformIO static analysis (which includes dependency
diagnostics). `make check` may delete build artifacts; preserve a binary first.

Firmware/dashboard base: Piotr Kochan's MIT-licensed MiniDisplay. Native protocol
sequence/templates: [pyatv](https://github.com/postlund/pyatv), MIT. Crypto:
pinned ESP8266 BearSSL, with its notices retained. JPEG decoder: ChaN TJpgDec,
with its redistribution terms retained. See `LICENSE`,
`firmware/THIRD-PARTY-NOTICES.md` and the accompanying license files.

This repository contains source, public example configuration and open assets.
It does not contain personal firmware binaries, Wi-Fi details, private logs,
account exports, real album screenshots or Apple font files.
