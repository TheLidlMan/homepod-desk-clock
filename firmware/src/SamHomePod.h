#pragma once
#include "ClockConfig.h"

#include <ESP8266WiFi.h>
#include <cmath>
#include "HomePodWiFiAdapter.h"
#include "SamHomePodArtwork.h"

// The native observer owns only HomePod metadata; playback stays on Apple devices.
class SamHomePod {
 public:
  ~SamHomePod() { disconnect(); }
  bool connected() const { return observer_ != nullptr; }
  const observer_receipt &diagnostics() const { return receipt_; }
  uint32_t pairingMillis() const { return pairingMillis_; }
  uint8_t phase() const { return transport_.lastPhase; }
  uint32_t minimumHeap() const {
    const uint32_t value = minimumHeap_ && minimumHeap_ < transport_.minimumHeap ? minimumHeap_ : transport_.minimumHeap;
    return value == UINT32_MAX ? 0 : value;
  }
  bool artworkAvailable() const { return artwork_.available(); }
  int artworkError() const { return artwork_.error(); }
  uint32_t artworkConversionMillis() const { return artwork_.conversionMillis(); }
  uint16_t artworkEdge() const { return artwork_.edge(); }
  bool artworkChanged() { return artwork_.consumeChanged(); }
  void stop() { disconnect(); }

  template <typename SetValue, typename SelectPage>
  void update(SetValue setValue, SelectPage selectPage, bool mayConnect) {
    const uint32_t tick = millis();
    if (WiFi.status() != WL_CONNECTED) {
      disconnect();
      publishIdle(setValue, selectPage);
      return;
    }
    if (!observer_) {
      if (!mayConnect || static_cast<int32_t>(tick - retryAt_) < 0) return;
      retryAt_ = tick + 30000;
      // Avoid starting a handshake while a renderer or HTTP request owns memory.
      if (ESP.getFreeHeap() < 15000 || ESP.getMaxFreeBlockSize() < 8192) return;
      factory_ = transport_.factory();
      const uint32_t pairingStarted = millis();
      transport_.beginBudget(30000);
      observer_ = homepod_observer_open(&factory_, &receipt_);
      clearRuntimeCheckpoint();
      pairingMillis_ = millis() - pairingStarted;
      sampleHeap();
      if (!observer_) {
        retryAt_ = millis() + 30000;
        publishIdle(setValue, selectPage);
        return;
      }
      lastUpdates_ = UINT32_MAX;
    }
    transport_.beginBudget(800);
    if (!homepod_observer_poll(observer_, millis())) {
      disconnect();
      retryAt_ = millis() + 30000;
      publishIdle(setValue, selectPage);
      return;
    }
    clearRuntimeCheckpoint();
    sampleHeap();
    transport_.beginBudget(800);
    artwork_.update(observer_, mayConnect);
    const mrp_metadata *music = homepod_observer_metadata(observer_);
    if (!music) return;
    const uint32_t now = millis();
    const bool playing = music->playback_state == 1 && music->title[0];
    if (lastUpdates_ != receipt_.state_updates) {
      lastUpdates_ = receipt_.state_updates;
      if (!hasPosition_ || music->elapsed != lastElapsed_ || strcmp(positionTitle_, music->title)) {
        positionAt_ = now;
        lastElapsed_ = music->elapsed;
        memcpy(positionTitle_, music->title, sizeof(positionTitle_));
        position_ = std::isfinite(music->elapsed) ? music->elapsed : 0;
        hasPosition_ = true;
      } else if (playing != wasPlaying_) {
        if (wasPlaying_) position_ += (now - positionAt_) / 1000.0;
        positionAt_ = now;
      }
    } else if (now - lastPublish_ < 1000) {
      return;
    }
    wasPlaying_ = playing;
    lastPublish_ = now;
    setValue("music_header", "HOMEPOD");
    setText(setValue, "music_title", music->title);
    setText(setValue, "music_artist", music->artist);
    const double rate = std::isfinite(music->playback_rate) && music->playback_rate > 0
        ? music->playback_rate : 1;
    const double position = position_ + (playing ? (now - positionAt_) / 1000.0 * rate : 0);
    int progress = 0;
    if (std::isfinite(music->duration) && music->duration > 0 && std::isfinite(position))
      progress = static_cast<int>(lround(fmax(0.0, fmin(100.0, position / music->duration * 100))));
    char text[12];
    snprintf(text, sizeof(text), "%d", progress);
    setValue("music_progress", text);
    setValue("music_playing", playing ? "true" : "false");
    if (playing != showingMusic_) {
      showingMusic_ = playing;
      selectPage(playing ? "music" : "clock");
    }
  }

 private:
  void sampleHeap() {
    const uint32_t heap = ESP.getFreeHeap();
    if (!minimumHeap_ || heap < minimumHeap_) minimumHeap_ = heap;
  }
  void disconnect() {
    if (observer_) {
      checkpointRuntime(64);
      homepod_observer_close(observer_);
      clearRuntimeCheckpoint();
    }
    observer_ = nullptr;
    hasPosition_ = false;
    artwork_.reset();
  }
  template <typename SetValue, typename SelectPage>
  void publishIdle(SetValue setValue, SelectPage selectPage) {
    setValue("music_playing", "false");
    if (showingMusic_) {
      showingMusic_ = false;
      selectPage("clock");
    }
  }
  template <typename SetValue>
  static void setText(SetValue setValue, const char *name, const char *source) {
    // Existing dashboard values hold 48 bytes; never split a UTF-8 character.
    char text[49];
    size_t length = strlen(source);
    if (length > 48) {
      length = 48;
      while (length && (static_cast<uint8_t>(source[length]) & 0xc0) == 0x80) --length;
    }
    memcpy(text, source, length);
    text[length] = 0;
    setValue(name, text);
  }
  HomePodWiFiAdapter transport_{IPAddress(DESK_HOMEPOD_ADDRESS)};
  SamHomePodArtwork artwork_;
  homepod_factory factory_{};
  observer_receipt receipt_{};
  homepod_observer *observer_ = nullptr;
  // Keep the web panel/recovery available before the first pairing attempt.
  uint32_t retryAt_ = 10000, lastPublish_ = 0, lastUpdates_ = UINT32_MAX;
  uint32_t positionAt_ = 0, minimumHeap_ = 0;
  uint32_t pairingMillis_ = 0;
  double position_ = 0, lastElapsed_ = 0;
  char positionTitle_[129]{};
  bool showingMusic_ = false, wasPlaying_ = false, hasPosition_ = false;
};
