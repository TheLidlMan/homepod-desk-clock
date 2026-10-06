#pragma once

#include <Arduino.h>
#include <LittleFS.h>
#include <memory>
#include <new>

#include "ImageRle.h"
#include "ImageRowResampler.h"
#include "DecodedImageRows.h"

constexpr size_t kImageAssetIdLength = 16;
constexpr size_t kImageAssetHeaderBytes = 8;
constexpr size_t kAnimatedImageAssetHeaderBytes = 16;
constexpr size_t kAnimatedImageFrameRecordBytesV1 = 10;
constexpr size_t kAnimatedImageFrameRecordBytesV2 = 18;
constexpr uint8_t kAnimatedImageDamageBandHeight = 8;
constexpr uint8_t kAnimatedImageMaximumDamageBands = 30;
constexpr size_t kAnimatedImageFrameRecordBytesV3 =
    kAnimatedImageFrameRecordBytesV2 +
    kAnimatedImageMaximumDamageBands * 2;
constexpr uint16_t kMaxAnimatedImageFrames = 120;
constexpr size_t kMaxImageAssetBytes = 768 * 1024;
constexpr size_t kImageStorageReserveBytes = 256 * 1024;
constexpr uint8_t kImageRenderCacheEntries = 4;
constexpr uint8_t kImageRowIndexStride = 16;
constexpr uint8_t kImageRowIndexEntries = 15;

enum class ImageFit : uint8_t { Cover, Contain, Stretch };

inline ImageFit parseImageFit(const char *value) {
  if (value && strcmp(value, "contain") == 0) return ImageFit::Contain;
  if (value && strcmp(value, "stretch") == 0) return ImageFit::Stretch;
  return ImageFit::Cover;
}

bool validImageAssetId(const String &id);
String imageAssetPath(const String &id);

struct ImageAssetInfo {
  uint16_t width = 0;
  uint16_t height = 0;
  uint16_t frameCount = 1;
  uint32_t durationMs = 0;
  uint8_t frameRecordBytes = 0;
  bool animated = false;
};

struct ImageAssetFrame {
  uint16_t durationMs = 0;
  uint32_t offset = 0;
  uint32_t length = 0;
  uint16_t dirtyX = 0;
  uint16_t dirtyY = 0;
  uint16_t dirtyWidth = 0;
  uint16_t dirtyHeight = 0;
};

bool readImageAssetInfo(File &file, ImageAssetInfo *info);
bool readImageAssetFrame(File &file, const ImageAssetInfo &info,
                         uint16_t index, ImageAssetFrame *frame);
bool readImageAssetHeader(File &file, uint16_t *width, uint16_t *height);
bool readImageAssetRowSize(File &file, uint16_t *size);
bool validImageAsset(File &file, uint16_t *width = nullptr,
                     uint16_t *height = nullptr);

class ImageAssetByteReader {
 public:
  explicit ImageAssetByteReader(File &file) : file_(file) {}

  bool begin(size_t offset, size_t length);
  bool readByte(uint8_t &value);
  bool skipBytes(size_t length);
  size_t remaining() const { return remaining_; }

 private:
  static constexpr size_t kBufferBytes = 128;
  File &file_;
  uint8_t buffer_[kBufferBytes];
  size_t offset_ = 0;
  size_t size_ = 0;
  size_t remaining_ = 0;
};

class ImageAssetMemoryReader {
 public:
  bool begin(const uint8_t *data, size_t length) {
    data_ = data;
    remaining_ = length;
    return data_ != nullptr;
  }
  bool readByte(uint8_t &value) {
    if (!remaining_) return false;
    value = *data_++;
    --remaining_;
    return true;
  }
  bool skipBytes(size_t length) {
    if (length > remaining_) return false;
    data_ += length;
    remaining_ -= length;
    return true;
  }
  size_t remaining() const { return remaining_; }

 private:
  const uint8_t *data_ = nullptr;
  size_t remaining_ = 0;
};

class ImageAssetRenderCache {
 public:
  ~ImageAssetRenderCache();

  File *open(const char *assetId, uint16_t frameIndex, uint16_t *width,
             uint16_t *height);
  bool seekRow(const char *assetId, uint16_t frameIndex, uint16_t row);
  void enableRowCache();
  bool hasRowCache() const { return decodedRows_ != nullptr; }
  void setCooperativeYield(bool enabled) { cooperativeYield_ = enabled; }
  bool cooperativeYield() const { return cooperativeYield_; }
  bool readRow(const char *assetId, uint16_t frameIndex, uint16_t row,
               uint16_t width, uint16_t *out);
  bool readRowWindow(const char *assetId, uint16_t frameIndex, uint16_t row,
                     uint16_t width, uint16_t first, uint16_t end,
                     uint16_t *out);
  // Shared by sequential draw calls, never retained by a canvas.
  uint16_t *rowPixels() { return rowPixels_; }

 private:
  struct Entry {
    File file;
    char id[kImageAssetIdLength + 1]{};
    uint16_t width = 0;
    uint16_t height = 0;
    uint16_t frameIndex = 0;
    uint32_t frameOffset = kImageAssetHeaderBytes;
    uint32_t frameEnd = 0;
    uint32_t rowOffsets[kImageRowIndexEntries]{};
    uint32_t lastRowOffset = 0;
    uint16_t lastRow = 0;
    uint32_t usedAt = 0;
  };

  bool initializeRowIndex(Entry &entry);

  Entry entries_[kImageRenderCacheEntries];
  uint16_t rowPixels_[240];
  uint8_t encodedRow_[512];
  uint32_t useCounter_ = 0;
  std::unique_ptr<DecodedImageRows> decodedRows_;
  bool cooperativeYield_ = true;
};

template <typename Canvas>
bool drawImageAsset(Canvas &canvas, const char *assetId, int16_t x, int16_t y,
                    int16_t width, int16_t height, ImageFit fit,
                    int16_t clipX = 0, int16_t clipY = 0,
                    int16_t clipWidth = 240, int16_t clipHeight = 240,
                    ImageAssetRenderCache *cache = nullptr,
                    uint16_t frameIndex = 0) {
  if (!assetId || !assetId[0] || width <= 0 || height <= 0) return false;
  File file;
  File *retainedFile = nullptr;
  uint16_t sourceWidth = 0;
  uint16_t sourceHeight = 0;
  const bool retained = cache != nullptr;
  if (retained) {
    retainedFile = cache->open(assetId, frameIndex, &sourceWidth, &sourceHeight);
    if (!retainedFile) return false;
    file = *retainedFile;
  } else {
    file = LittleFS.open(imageAssetPath(String(assetId)), "r");
    ImageAssetInfo info;
    ImageAssetFrame frame;
    if (!file || !readImageAssetInfo(file, &info) ||
        !readImageAssetFrame(file, info, frameIndex, &frame)) {
      if (file) file.close();
      return false;
    }
    sourceWidth = info.width;
    sourceHeight = info.height;
  }

  int16_t destinationX = x;
  int16_t destinationY = y;
  int16_t destinationWidth = width;
  int16_t destinationHeight = height;
  int16_t sourceX = 0;
  int16_t sourceY = 0;
  int16_t sampledWidth = sourceWidth;
  int16_t sampledHeight = sourceHeight;
  const int32_t sourceRatio = static_cast<int32_t>(sourceWidth) * height;
  const int32_t destinationRatio = static_cast<int32_t>(width) * sourceHeight;
  if (fit == ImageFit::Contain) {
    if (sourceRatio > destinationRatio) {
      destinationHeight = max<int16_t>(1, static_cast<int32_t>(width) * sourceHeight / sourceWidth);
      destinationY += (height - destinationHeight) / 2;
    } else {
      destinationWidth = max<int16_t>(1, static_cast<int32_t>(height) * sourceWidth / sourceHeight);
      destinationX += (width - destinationWidth) / 2;
    }
  } else if (fit == ImageFit::Cover) {
    if (sourceRatio > destinationRatio) {
      sampledWidth = max<int16_t>(1, static_cast<int32_t>(sourceHeight) * width / height);
      sourceX = (sourceWidth - sampledWidth) / 2;
    } else {
      sampledHeight = max<int16_t>(1, static_cast<int32_t>(sourceWidth) * height / width);
      sourceY = (sourceHeight - sampledHeight) / 2;
    }
  }

  const int16_t visibleLeft = max<int16_t>(destinationX, clipX);
  const int16_t visibleTop = max<int16_t>(destinationY, clipY);
  const int16_t visibleRight = min<int16_t>(destinationX + destinationWidth,
                                            clipX + clipWidth);
  const int16_t visibleBottom = min<int16_t>(destinationY + destinationHeight,
                                             clipY + clipHeight);
  if (visibleLeft >= visibleRight || visibleTop >= visibleBottom) {
    if (!retained) file.close();
    return true;
  }

  // Keep the 480-byte row off the small ESP8266 continuation stack.
  std::unique_ptr<uint16_t[]> uncachedRow;
  if (!cache) uncachedRow.reset(new (std::nothrow) uint16_t[240]);
  uint16_t *line = cache ? cache->rowPixels() : uncachedRow.get();
  if (!line) return false;
  const int16_t outputWidth = visibleRight - visibleLeft;
  const int16_t firstDestinationColumn = visibleLeft - destinationX;
  const uint16_t firstSourceColumn = sourceX +
      static_cast<uint32_t>(firstDestinationColumn) * sampledWidth / destinationWidth;
  const uint16_t endSourceColumn = sourceX +
      static_cast<uint32_t>(firstDestinationColumn + outputWidth - 1) *
          sampledWidth / destinationWidth + 1;
  ImageAssetByteReader reader(file);
  int16_t bufferedY = -1;
  uint32_t frameEnd = file.size();
  if (!retained) {
    ImageAssetInfo info;
    ImageAssetFrame frame;
    if (!readImageAssetInfo(file, &info) ||
        !readImageAssetFrame(file, info, frameIndex, &frame) ||
        !file.seek(frame.offset)) {
      file.close();
      return false;
    }
    frameEnd = frame.offset + frame.length;
  }
  if (!retained && file.position() >= frameEnd) {
    file.close();
    return false;
  }
  for (int16_t destinationRow = visibleTop; destinationRow < visibleBottom;
       ++destinationRow) {
    const int16_t mappedY = sourceY +
        static_cast<int32_t>(destinationRow - destinationY) * sampledHeight /
            destinationHeight;
    if (mappedY != bufferedY) {
      if (retained) {
        if (!cache->readRowWindow(assetId, frameIndex, mappedY, sourceWidth,
                                  firstSourceColumn, endSourceColumn, line))
          return false;
        bufferedY = mappedY;
      } else while (bufferedY < mappedY) {
        uint16_t rowBytes = 0;
        const int16_t nextRow = bufferedY + 1;
        if (!readImageAssetRowSize(file, &rowBytes) || rowBytes == 0 ||
            file.position() + rowBytes > frameEnd) {
          if (!retained) file.close();
          return false;
        }
        if (nextRow < mappedY) {
          if (!file.seek(file.position() + rowBytes)) {
            if (!retained) file.close();
            return false;
          }
          bufferedY = nextRow;
          continue;
        }
        if (!reader.begin(file.position(), rowBytes)) {
          if (!retained) file.close();
          return false;
        }
        if (!decodeRgb565Window(reader, sourceWidth, firstSourceColumn,
                                 endSourceColumn, line) || reader.remaining() != 0) {
          if (!retained) file.close();
          return false;
        }
        ++bufferedY;
#if defined(ESP8266)
        if ((!cache || cache->cooperativeYield()) && (bufferedY & 15) == 0)
          optimistic_yield(20000);
#endif
      }
#if defined(ESP8266)
      constexpr bool swapBytes = true;
#else
      constexpr bool swapBytes = false;
#endif
      if (!resampleImageRow(line, 240, sourceWidth, sourceX, sampledWidth,
                            destinationWidth, firstDestinationColumn,
                            outputWidth, swapBytes)) return false;
    }
    canvas.pushImage(visibleLeft, destinationRow, outputWidth, 1, line);
#if defined(ESP8266)
    if ((!cache || cache->cooperativeYield()) && (destinationRow & 15) == 0)
      optimistic_yield(20000);
#endif
  }
  if (!retained) file.close();
  return true;
}
