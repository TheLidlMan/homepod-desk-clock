#pragma once

#include <LittleFS.h>
#include "ImageAssets.h"
#include "CrashDiagnostics.h"
extern "C" {
#include "homepod_observer.h"
#include "jpeg_mdi.h"
}

// One current cover, bounded temporary files, and a reusable generic cover.
// The receive callback only persists JPEG bytes. Decode after poll frees its frame.
class SamHomePodArtwork {
 public:
  bool available() const { return available_; }
  int error() const { return error_; }
  uint32_t conversionMillis() const { return conversionMillis_; }
  uint16_t edge() const { return available_ ? edge_ : 0; }
  bool consumeChanged() { const bool changed = changed_; changed_ = false; return changed; }
  void reset() {
    initialized_ = false;
    requestTrack_ = 0;
    received_ = false;
    available_ = false;
    LittleFS.remove(kJpeg);
    LittleFS.remove(kTemporary);
  }

  void update(homepod_observer *observer, bool mayWork) {
    const mrp_metadata *music = homepod_observer_metadata(observer);
    if (!music || !mayWork || !music->title[0]) return;
    if (!initialized_) {
      initialized_ = true;
      ensureGeneric();
      restoreGeneric();
    }
    const uint32_t current = identity(observer, *music);
    if (current != track_) {
      track_ = current;
      attempt_ = 0;
      nextRequest_ = millis();
      if (available_) restoreGeneric();
      available_ = false;
    }
    if (received_) {
      received_ = false;
      if (requestTrack_ == track_) convert();
      LittleFS.remove(kJpeg);
    }
    if (!available_ && music->playback_state == 1 && music->title[0] &&
        static_cast<int32_t>(millis() - nextRequest_) >= 0) {
      // Detailed covers can exceed the JPEG cap; retry at a smaller resolution.
      static const uint16_t edges[] = {80, 64, 48};
      const uint16_t requestedEdge = edges[attempt_ < 2 ? attempt_ : 2];
      checkpointRuntime(60);
      const bool requested = homepod_observer_request_artwork(observer, requestedEdge, receive, this);
      clearRuntimeCheckpoint();
      if (requested) {
        requestTrack_ = track_;
        if (attempt_ < 2) ++attempt_;
        nextRequest_ = millis() + 15000;
      } else {
        nextRequest_ = millis() + 1000;
      }
    }
  }

 private:
  static constexpr const char *kAsset = "/img_0000000000000001.mdi";
  static constexpr const char *kGeneric = "/sam-generic.mdi";
  static constexpr const char *kJpeg = "/sam-cover.jpg";
  static constexpr const char *kTemporary = "/sam-cover.mdi";
  static uint32_t identity(homepod_observer *observer, const mrp_metadata &music) {
    uint32_t hash = 2166136261UL;
    const char *item = homepod_observer_item(observer);
    // Metadata can arrive in pieces without the actual queue item changing.
    const char *parts[] = {item && *item ? item : music.title,
                          item && *item ? "" : music.artist,
                          item && *item ? "" : music.album};
    for (const char *part : parts) {
      if (part) for (const unsigned char *p = reinterpret_cast<const unsigned char *>(part); *p; ++p)
        hash = (hash ^ *p) * 16777619UL;
      hash = (hash ^ 0xff) * 16777619UL;
    }
    return hash;
  }
  static bool receive(void *opaque, const uint8_t *jpeg, size_t size,
                      uint16_t width, uint16_t height) {
    auto &self = *static_cast<SamHomePodArtwork *>(opaque);
    if (ESP.getFreeHeap() < 5000 || size > 7168 || width != height || width < 16 || width > 118) return false;
    File file = LittleFS.open(kJpeg, "w");
    if (!file) { self.error_ = 201; return false; }
    const bool ok = file.write(jpeg, size) == size;
    file.close();
    if (!ok) { LittleFS.remove(kJpeg); self.error_ = 202; return false; }
    self.edge_ = width;
    self.received_ = true;
    return true;
  }
  struct Conversion {
    File input, output;
    uint32_t started;
  };
  static size_t read(void *opaque, uint8_t *bytes, size_t size) {
    return static_cast<Conversion *>(opaque)->input.read(bytes, size);
  }
  static bool write(void *opaque, const uint8_t *bytes, size_t size) {
    return static_cast<Conversion *>(opaque)->output.write(bytes, size) == size;
  }
  static bool alive(void *opaque) {
    yield();
    return millis() - static_cast<Conversion *>(opaque)->started < 3000;
  }
  void convert() {
    const size_t bytes = jpeg_mdi_workspace_size();
    // Decoder workspace is heap-owned; leave space for FS and network callbacks.
    if (ESP.getFreeHeap() < bytes + 5000 || ESP.getMaxFreeBlockSize() < bytes) {
      error_ = 203;
      return;
    }
    void *memory = malloc(bytes);
    if (!memory) { error_ = 203; return; }
    Conversion io{LittleFS.open(kJpeg, "r"), LittleFS.open(kTemporary, "w"), millis()};
    jpeg_mdi_receipt receipt{};
    jpeg_mdi_io callbacks{&io, read, write, alive};
    checkpointRuntime(61);
    bool ok = io.input && io.output && jpeg_mdi_convert(memory, &callbacks, edge_, &receipt);
    clearRuntimeCheckpoint();
    conversionMillis_ = millis() - io.started;
    free(memory);
    io.input.close();
    io.output.close();
    if (ok) {
      File result = LittleFS.open(kTemporary, "r");
      uint16_t width = 0, height = 0;
      ok = result && validImageAsset(result, &width, &height) && width == edge_ && height == edge_;
      result.close();
    }
    if (ok) ok = LittleFS.rename(kTemporary, kAsset);
    error_ = ok ? 0 : (receipt.error ? receipt.error : 204);
    if (ok) { available_ = true; changed_ = true; }
    else LittleFS.remove(kTemporary);
  }
  void ensureGeneric() {
    File existing = LittleFS.open(kGeneric, "r");
    const bool valid = existing && validImageAsset(existing);
    existing.close();
    if (valid) return;
    checkpointRuntime(62);
    File file = LittleFS.open(kGeneric, "w");
    const uint8_t header[] = {'M','D','I','2',118,0,118,0};
    bool ok = file && file.write(header, sizeof(header)) == sizeof(header);
    for (int y = 0; ok && y < 118; ++y) {
      uint8_t row[3 * 118];
      size_t count = 0;
      uint16_t previous = 0;
      unsigned run = 0;
      auto emit = [&]() {
        row[count++] = 0x80 | (run - 1);
        row[count++] = previous;
        row[count++] = previous >> 8;
      };
      for (int x = 0; x < 118; ++x) {
        const int dx = x - 59, dy = y - 59, radius = dx * dx + dy * dy;
        const uint16_t color = radius <= 64 ? 0xaed8 :
            radius >= 576 && radius <= 625 ? 0x642e :
            radius <= 1444 ? 0x10e2 : 0x2a47;
        if (run && color != previous) { emit(); run = 0; }
        previous = color;
        ++run;
      }
      emit();
      const uint8_t size[] = {static_cast<uint8_t>(count), static_cast<uint8_t>(count >> 8)};
      ok = file.write(size, 2) == 2 && file.write(row, count) == count;
      yield();
    }
    file.close();
    if (!ok) LittleFS.remove(kGeneric);
    clearRuntimeCheckpoint();
  }
  void restoreGeneric() {
    checkpointRuntime(63);
    File source = LittleFS.open(kGeneric, "r"), target = LittleFS.open(kTemporary, "w");
    bool ok = source && target;
    uint8_t bytes[256];
    while (ok && source.available()) {
      const size_t count = source.read(bytes, sizeof(bytes));
      ok = count && target.write(bytes, count) == count;
      yield();
    }
    source.close(); target.close();
    if (ok) ok = LittleFS.rename(kTemporary, kAsset);
    if (ok) changed_ = true;
    else {
      error_ = 205;
      LittleFS.remove(kTemporary);
      // A failed fallback write must not leave another song's cover visible.
      LittleFS.remove(kAsset);
      changed_ = true;
    }
    clearRuntimeCheckpoint();
  }
  uint32_t track_ = 0, requestTrack_ = 0, nextRequest_ = 0, conversionMillis_ = 0;
  uint16_t edge_ = 0;
  uint8_t attempt_ = 0;
  int error_ = 0;
  bool initialized_ = false, available_ = false, received_ = false, changed_ = false;
};
