PIO := $(CURDIR)/.venv/bin/pio
export PLATFORMIO_CORE_DIR := $(CURDIR)/.platformio
REPOSITORY_VERSION := $(patsubst v%,%,$(shell git describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null))
FIRMWARE_VERSION ?= $(if $(REPOSITORY_VERSION),$(REPOSITORY_VERSION)-dev,0.0.0-dev)
export MINI_DISPLAY_BUILD_VERSION := $(FIRMWARE_VERSION)

.PHONY: build build-all package profile-build clean check size elf-report bootstrap-build bootstrap-clean card-build card-check schema-sync schema-check web-build web-check test-native

build: web-build
	python3 firmware/scripts/index_smooth_fonts.py
	cd firmware && $(PIO) run

build-all: package

profile-build: web-build
	@test -n "$(PROFILE)" || { echo "PROFILE is required"; exit 1; }
	cd firmware && $(PIO) run --environment "$(PROFILE)"

package: web-build
	mkdir -p dist
	cd firmware && $(PIO) run -e sdpro
	cp firmware/.pio/build/sdpro/firmware.bin dist/SDP-HomePod-Desk-Clock.bin

clean:
	cd firmware && $(PIO) run --target clean

bootstrap-build:
	@printf '%s' "$(BOOTSTRAP_VERSION)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-rc(\.[0-9]+)?)?$$' || { echo "BOOTSTRAP_VERSION must be a supported release version without v prefix"; exit 1; }
	@printf '%s' "$(BOOTSTRAP_SHA256)" | grep -Eq '^[0-9a-f]{64}$$' || { echo "BOOTSTRAP_SHA256 must be 64 lowercase hex characters"; exit 1; }
	cd firmware-bootstrap && \
		BOOTSTRAP_VERSION="$(BOOTSTRAP_VERSION)" \
		BOOTSTRAP_SHA256="$(BOOTSTRAP_SHA256)" \
		$(PIO) run

bootstrap-clean:
	cd firmware-bootstrap && $(PIO) run --target clean

check: schema-check
	cd firmware && $(PIO) check

web-build: web-check
	npm --prefix firmware/web run build
	python3 firmware/scripts/embed_web.py

web-check:
	npm --prefix firmware/web run format:check
	npm --prefix firmware/web run check

size: build
	$(PIO) run --project-dir firmware --target size

elf-report:
	@test -f firmware/.pio/build/sdpro/firmware.elf || { echo "build firmware first"; exit 1; }
	python3 firmware/scripts/elf_memory_report.py \
		firmware/.pio/build/sdpro/firmware.elf \
		--toolchain $(PLATFORMIO_CORE_DIR)/packages/toolchain-xtensa/bin

card-build: schema-sync
	python3 firmware/scripts/export_preview_fonts.py
	npm --prefix integration/card run build

card-check: schema-check
	npm --prefix integration/card run check

schema-sync:
	python3 dashboard/sync_schema.py

schema-check:
	python3 dashboard/sync_schema.py --check
	python3 tests/test_schema_compactor.py

test-native:
	@test -d firmware/.pio/libdeps/sdpro/ArduinoJson/src || { echo "run make build first to install ArduinoJson"; exit 1; }
	@mkdir -p .cache/tests
	python3 firmware/tests/test_homepod_timing.py
	python3 firmware/tests/test_runtime_checkpoint.py
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-DESP8266 -I firmware/tests/image_asset_stubs -I firmware/src \
		firmware/tests/image_asset_cache_test.cpp firmware/src/ImageAssets.cpp -o .cache/tests/image-asset-cache
	.cache/tests/image-asset-cache
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/tests/weather_stubs -I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/sam_clock_test.cpp -o .cache/tests/sam-clock
	.cache/tests/sam-clock
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-DSAM_HOMEPOD_TRACE=0 -I firmware/tests/homepod_stubs -I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/homepod_transport_test.cpp firmware/src/HomePodWiFiAdapter.cpp \
		-o .cache/tests/homepod-transport
	.cache/tests/homepod-transport
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/notification_test.cpp -o .cache/tests/notifications
	.cache/tests/notifications
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/stored_config_test.cpp firmware/src/StoredConfig.cpp \
		-o .cache/tests/stored-config
	.cache/tests/stored-config
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-DSTATIC_SMOOTH_TEST -DPROGMEM= -DTL_DATUM=0 -I firmware/src \
		firmware/tests/notification_painter_test.cpp firmware/src/StaticSmoothFonts.generated.cpp \
		-o .cache/tests/notification-painter
	.cache/tests/notification-painter
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/marquee_test.cpp -o .cache/tests/marquee
	.cache/tests/marquee
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/display_refresh_test.cpp -o .cache/tests/display-refresh
	.cache/tests/display-refresh
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/firmware_version_test.cpp -o .cache/tests/firmware-version
	.cache/tests/firmware-version
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/number_transform_test.cpp -o .cache/tests/number-transform
	.cache/tests/number-transform
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/decimal_parser_test.cpp firmware/src/DecimalParser.cpp \
		-o .cache/tests/decimal-parser
	.cache/tests/decimal-parser
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/time_format_test.cpp \
		-o .cache/tests/time-format
	.cache/tests/time-format
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-DSTATIC_SMOOTH_TEST -DPROGMEM= -I firmware/src firmware/tests/static_smooth_font_test.cpp \
		firmware/src/StaticSmoothFonts.generated.cpp -o .cache/tests/static-smooth-font
	.cache/tests/static-smooth-font
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/transition_plan_test.cpp -o .cache/tests/transition-plan
	.cache/tests/transition-plan
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/decoded_image_rows_test.cpp -o .cache/tests/decoded-image-rows
	.cache/tests/decoded-image-rows
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/transition_pixel_transfer_test.cpp -o .cache/tests/transition-pixel-transfer
	.cache/tests/transition-pixel-transfer
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/image_row_resampler_test.cpp -o .cache/tests/image-row-resampler
	.cache/tests/image-row-resampler
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/dashboard_page_loader_test.cpp -o .cache/tests/dashboard-page-loader
	.cache/tests/dashboard-page-loader
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/graph_painter_test.cpp -o .cache/tests/graph-painter
	.cache/tests/graph-painter
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/graph_snapshot_test.cpp -o .cache/tests/graph-snapshot
	.cache/tests/graph-snapshot
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/tests/graph_stubs -I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/graph_history_test.cpp firmware/src/GraphHistory.cpp -o .cache/tests/graph-history
	.cache/tests/graph-history
	python3 tests/test_graph_validation.py
	python3 tests/test_data_rate.py
	python3 tests/test_page_timing.py
	python3 tests/test_rotation_switch.py
	python3 tests/test_scene_updates.py
	python3 tests/test_history_aggregation.py
	python3 tests/test_history_data.py
	python3 tests/test_image_codec.py
	python3 tests/test_value_transform.py
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/display_data_test.cpp -o .cache/tests/display-data
	.cache/tests/display-data
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/graph_series_test.cpp -o .cache/tests/graph-series
	.cache/tests/graph-series
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/weather_value_test.cpp -o .cache/tests/weather-values
	.cache/tests/weather-values
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/text_flow_test.cpp -o .cache/tests/text-flow
	.cache/tests/text-flow
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/image_rle_test.cpp -o .cache/tests/image-rle
	.cache/tests/image-rle
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/request_body_test.cpp -o .cache/tests/request-body
	.cache/tests/request-body
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src -I firmware/.pio/libdeps/sdpro/ArduinoJson/src \
		firmware/tests/free_text_frame_test.cpp -o .cache/tests/free-text-frame
	.cache/tests/free-text-frame
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-DCOVERAGE_TEST -DPROGMEM= -I firmware/src firmware/tests/coverage_font_test.cpp \
		firmware/src/CoverageFonts.generated.cpp -o .cache/tests/coverage-font
	.cache/tests/coverage-font
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_graph_test.cpp -o .cache/tests/scene-graph
	.cache/tests/scene-graph
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_tile_buffer_test.cpp -o .cache/tests/scene-tile-buffer
	.cache/tests/scene-tile-buffer
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_layout_test.cpp -o .cache/tests/scene-layout
	.cache/tests/scene-layout
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_render_scheduler_test.cpp -o .cache/tests/scene-render-scheduler
	.cache/tests/scene-render-scheduler
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_compositor_test.cpp -o .cache/tests/scene-compositor
	.cache/tests/scene-compositor
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_state_test.cpp -o .cache/tests/scene-state
	.cache/tests/scene-state
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/page_transition_math_test.cpp -o .cache/tests/page-transition-math
	.cache/tests/page-transition-math
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_transition_frame_test.cpp -o .cache/tests/scene-transition-frame
	.cache/tests/scene-transition-frame
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/display_snapshot_mover_test.cpp -o .cache/tests/display-snapshot-mover
	.cache/tests/display-snapshot-mover
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/scene_animation_timeline_test.cpp -o .cache/tests/scene-animation-timeline
	.cache/tests/scene-animation-timeline
	$(CXX) -std=c++17 -Wall -Wextra -Werror -fsanitize=address,undefined -g \
		-I firmware/src firmware/tests/dashboard_page_scanner_test.cpp -o .cache/tests/dashboard-page-scanner
	.cache/tests/dashboard-page-scanner
