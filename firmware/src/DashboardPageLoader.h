#pragma once

#include <algorithm>
#include <ArduinoJson.h>
#include "DashboardPageScanner.h"

class DashboardPageLoader {
 public:
  enum class Error : uint8_t {
    None,
    PageNotFound,
    PageTooLarge,
    Allocation,
    Read,
    Json,
  };

  static constexpr size_t kMaximumPageBytes = 6 * 1024;
  static constexpr size_t kDocumentCapacity = 8 * 1024;
  static constexpr size_t kMinimumDocumentCapacity = 3 * 1024;

  DashboardPageLoader() : document_(0) {}

  bool contains(uint8_t pageIndex) const {
    return ready_ && pageIndex_ == pageIndex;
  }

  void clear() {
    document_ = DynamicJsonDocument(0);
    ready_ = false;
  }

  size_t allocatedBytes() const { return document_.capacity(); }
  uint32_t parseCount() const { return parseCount_; }

  template <typename FileType>
  bool load(FileType &file, uint8_t pageIndex) {
    if (contains(pageIndex)) return true;
    // Keep one bounded arena and reuse it across pages. Releasing, allocating
    // 8 KiB and shrinking on every transition fragments the ESP8266 heap.
    document_.clear();
    ready_ = false;
    error_ = Error::None;
    if (!file.seek(0)) return fail(Error::Read);

    DashboardPageScanner scanner(pageIndex);
    while (file.available()) {
      const size_t count = file.readBytes(scanBuffer_, sizeof(scanBuffer_));
      if (count == 0) return fail(Error::Read);
      for (size_t index = 0; index < count; ++index) {
        if (scanner.consume(scanBuffer_[index])) break;
      }
      if (scanner.found()) break;
    }
    if (!scanner.found()) return fail(Error::PageNotFound);

    const DashboardPageSlice slice = scanner.slice();
    if (slice.length == 0 || slice.length > kMaximumPageBytes) {
      return fail(Error::PageTooLarge);
    }
    const size_t estimatedCapacity = capacityFor(slice.length);
    bool freshAllocation = false;
    if (document_.capacity() == 0) {
      document_ = DynamicJsonDocument(estimatedCapacity);
      freshAllocation = true;
      if (document_.capacity() < estimatedCapacity) {
        return fail(Error::Allocation);
      }
    }
    // ArduinoJson stops after the first complete JSON value. Starting at the
    // scanned page object lets it read directly from LittleFS without keeping
    // a second 6 KiB page copy beside the DOM.
    if (!file.seek(slice.offset)) return fail(Error::Read);
    DeserializationError jsonError = deserializeJson(document_, file);
    ++parseCount_;
    while (jsonError == DeserializationError::NoMemory &&
           document_.capacity() < kDocumentCapacity) {
      const size_t nextCapacity = std::min(
          kDocumentCapacity,
          std::max(estimatedCapacity, document_.capacity() + 1024));
      document_ = DynamicJsonDocument(0);
      document_ = DynamicJsonDocument(nextCapacity);
      freshAllocation = true;
      if (document_.capacity() < nextCapacity || !file.seek(slice.offset)) {
        return fail(Error::Allocation);
      }
      jsonError = deserializeJson(document_, file);
      ++parseCount_;
    }
    if (jsonError || !document_.is<JsonObject>()) return fail(Error::Json);
    // Retain the parsed object tree, not the original JSON text or an unused
    // 8 KiB reserve. All JsonObjectConst views must be acquired after shrinking.
    if (freshAllocation) document_.shrinkToFit();
    pageIndex_ = pageIndex;
    ready_ = true;
    return true;
  }

  JsonObjectConst page() const { return document_.as<JsonObjectConst>(); }
  Error error() const { return error_; }

 private:
  static size_t capacityFor(size_t pageBytes) {
    size_t capacity = pageBytes + pageBytes / 2 + 1024;
    capacity = std::max(capacity, kMinimumDocumentCapacity);
    capacity = std::min(capacity, kDocumentCapacity);
    return (capacity + 255) & ~size_t(255);
  }

  bool fail(Error error) {
    clear();
    error_ = error;
    return false;
  }

  DynamicJsonDocument document_;
  char scanBuffer_[128]{};
  Error error_ = Error::None;
  uint32_t parseCount_ = 0;
  uint8_t pageIndex_ = 0;
  bool ready_ = false;
};
