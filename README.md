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
measurements remain unverified. A later exception reset has no confirmed source;
the captured program counter could not be mapped to firmware code. Failed data
frames distinguish malformed protobuf lengths, expired acknowledgement
budgets and failed acknowledgement writes in the transport diagnostic.
A later live 6,703-byte now-playing snapshot exposed an acknowledgement write
failure while its receive arena was still allocated. Data acknowledgements now
wait until that arena is released. The native owner drains them immediately
with a fresh bounded deadline, before rendering or handling another HTTP request.
Subscriptions and artwork requests wait behind them. Metadata sockets disable
Nagle buffering so small acknowledgements are sent promptly. The queue holds at most
eight sequences per authenticated record; larger bursts fail safely. Regression
checks reproduce the prior error 13 / -52 with a constrained transmit allocator
and cover expired receive deadlines, queue limits and malformed lengths.
Runtime heartbeat replies also wait asynchronously: one outstanding request,
continued music/event processing, and a ten-second deadline. Replies are read
only when available, in a fresh poll. This avoids disconnecting on a delayed
reply after the former receive budget has already been used. Tests reproduce
the prior error 17 / -2 and cover delayed replies, expiry, event ordering and
monotonic timer wrap. Logical frames split across authenticated packets use
separate polls, with a ten-second stall deadline and artwork requests deferred
until reassembly finishes. TCP sends explicitly flush with the remaining
operation budget as an inactivity timeout (capped at 800 ms) before receiving
the next large frame; failed sends abort the socket and reconnect. The pinned
SDK abort cleanup adds a default 300 ms inactivity wait. Copy semantics are retained to preserve buffer
lifetimes on SDK acknowledgement timeouts. Receive diagnostics distinguish
low-memory waits (94), deadlines (95), closed SDK sockets (96) and failed flushes (97).
If a full receive arena cannot fit safely, the ESP8266 drains ciphertext plus
its authentication tag through one bounded temporary file using the existing
frame as scratch. It then closes the writer, restores normal RAM headroom,
loads the exact ciphertext length and deletes the file before tag verification.
Failed I/O, timeouts, insufficient post-drain RAM and invalid tags fail closed.
The temporary file is also removed at the next connection after a power loss.
Aggregate spool count/maximum latency diagnostics make the fallback measurable.
The optional `SAM_HOMEPOD_SPOOL_TEST` diagnostic build forces this path once
for a live packet of at least 6KB; normal builds leave it disabled.
The disposable parsed page definition is released before native network work.
Compiled scenes own their text/assets; the definition reloads on the next
value recompilation. The JPEG decoder stripe is sized to the requested cover
width, saving 1,216 bytes for 80px compared with the prior 118px reserve. Exact
allocation sanitizer tests decode synthetic 17/80/118px covers and reject
mismatched dimensions. While a split logical frame is pending, weather, artwork
conversion and rendering defer until reassembly completes or expires.

Reverse event requests are serviced before DATA bursts; missing continuations
wait without blocking DATA and expire after ten seconds. Aggregate event
record/reply counters help distinguish that path from other disconnects.
Reconnects create fresh RTSP, SETUP and MRP request/handler identifiers. The
random data-stream seed is also used in the matching encryption salt. Stable
device settings and the fixed client-type UUID are preserved. These corrections
match the reference client; they do not establish the cause of every network
closure. Extended hardware endurance remains necessary.

## Build

Use Python 3.12, Node.js 22, a C/C++ compiler and Make.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-build.txt
npm --prefix firmware/web ci
cp firmware/src/ClockConfig.example.h firmware/src/ClockConfig.h
# Edit ClockConfig.h: HomePod hostname/address, weather location and night hours.
PATH="$PWD/.venv/bin:$PATH" make size FIRMWARE_VERSION=0.3.0-desk.6
PATH="$PWD/.venv/bin:$PATH" make test-native
```

The OTA image is `firmware/.pio/build/sdpro/firmware.bin`. Set
`DESK_HOMEPOD_HOSTNAME` to your speaker's exact Bonjour hostname, including
`.local`, to follow IP changes after a router replacement or DHCP renewal.
Find it with `dns-sd -Z _airplay._tcp local.` on a Mac: use the hostname in that
speaker's SRV record. Only the configured hostname is resolved; a missing
speaker retries without using a stale IP. The query runs only before pairing
with a bounded timeout and the SDK's fixed DNS cache. The pinned ESP8266
lwIP build supports multicast lookup for `.local` names. If you leave the
hostname empty, reserve the configured HomePod IP in your router instead.
Configuration is compiled in; there is no HomePod settings panel.
`ClockConfig.h` is ignored by Git. It needs no passwords.
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
