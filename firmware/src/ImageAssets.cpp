#include "ImageAssets.h"

bool validImageAssetId(const String &id) {
  if (id.length() != kImageAssetIdLength) return false;
  for (size_t index = 0; index < id.length(); ++index) {
    const char value = id[index];
    if (!((value >= '0' && value <= '9') ||
          (value >= 'a' && value <= 'f'))) return false;
  }
  return true;
}

String imageAssetPath(const String &id) { return "/img_" + id + ".mdi"; }

namespace {

uint16_t readLe16(const uint8_t *value) {
  return value[0] | (static_cast<uint16_t>(value[1]) << 8);
}

uint32_t readLe32(const uint8_t *value) {
  return value[0] | (static_cast<uint32_t>(value[1]) << 8) |
         (static_cast<uint32_t>(value[2]) << 16) |
         (static_cast<uint32_t>(value[3]) << 24);
}

bool validateImageFrame(File &file, const ImageAssetInfo &info,
                        const ImageAssetFrame &frame) {
  if (!frame.length || frame.offset > file.size() ||
      frame.length > file.size() - frame.offset ||
      !file.seek(frame.offset)) {
    return false;
  }
  const uint32_t frameEnd = frame.offset + frame.length;
  ImageAssetByteReader reader(file);
  uint16_t color = 0;
  for (uint16_t row = 0; row < info.height; ++row) {
    uint16_t rowBytes = 0;
    if (!readImageAssetRowSize(file, &rowBytes) || rowBytes == 0 ||
        file.position() + rowBytes > frameEnd ||
        !reader.begin(file.position(), rowBytes)) {
      return false;
    }
    Rgb565RleDecoder decoder;
    for (uint16_t column = 0; column < info.width; ++column) {
      if (!decoder.next(reader, color)) return false;
    }
    if (!decoder.packetComplete() || reader.remaining() != 0) return false;
#if defined(ESP8266)
    if ((row & 7) == 7) optimistic_yield(10000);
#endif
  }
  return file.position() == frameEnd;
}

}  // namespace

bool readImageAssetInfo(File &file, ImageAssetInfo *info) {
  if (!file || !info || file.size() < kImageAssetHeaderBytes + 3 ||
      file.size() > kMaxImageAssetBytes) {
    return false;
  }
  uint8_t header[kAnimatedImageAssetHeaderBytes]{};
  if (!file.seek(0) ||
      file.read(header, kImageAssetHeaderBytes) != kImageAssetHeaderBytes) {
    return false;
  }
  const bool animatedV1 = memcmp(header, "MDA1", 4) == 0;
  const bool animatedV2 = memcmp(header, "MDA2", 4) == 0;
  const bool animatedV3 = memcmp(header, "MDA3", 4) == 0;
  const bool animated = animatedV1 || animatedV2 || animatedV3;
  if (!animated && memcmp(header, "MDI2", 4) != 0) return false;
  const uint16_t width = readLe16(header + 4);
  const uint16_t height = readLe16(header + 6);
  if (!width || !height || width > 240 || height > 240) return false;
  *info = ImageAssetInfo{};
  info->width = width;
  info->height = height;
  info->animated = animated;
  info->frameRecordBytes = animatedV3
      ? kAnimatedImageFrameRecordBytesV2 +
            ((height + kAnimatedImageDamageBandHeight - 1) /
             kAnimatedImageDamageBandHeight) * 2
      : animatedV2 ? kAnimatedImageFrameRecordBytesV2
                   : kAnimatedImageFrameRecordBytesV1;
  if (!animated) return true;
  if (file.size() < kAnimatedImageAssetHeaderBytes +
                        2 * info->frameRecordBytes + 3 ||
      file.read(header + kImageAssetHeaderBytes,
                kAnimatedImageAssetHeaderBytes - kImageAssetHeaderBytes) !=
          kAnimatedImageAssetHeaderBytes - kImageAssetHeaderBytes) {
    return false;
  }
  info->frameCount = readLe16(header + 8);
  info->durationMs = readLe32(header + 12);
  if (info->frameCount < 2 || info->frameCount > kMaxAnimatedImageFrames ||
      !info->durationMs ||
      kAnimatedImageAssetHeaderBytes +
              static_cast<uint32_t>(info->frameCount) *
                  info->frameRecordBytes >=
          file.size()) {
    return false;
  }
  return true;
}

bool readImageAssetFrame(File &file, const ImageAssetInfo &info,
                         uint16_t index, ImageAssetFrame *frame) {
  if (!file || !frame || index >= info.frameCount) return false;
  *frame = ImageAssetFrame{};
  if (!info.animated) {
    if (index != 0 || file.size() <= kImageAssetHeaderBytes) return false;
    *frame = {0, kImageAssetHeaderBytes,
              static_cast<uint32_t>(file.size() - kImageAssetHeaderBytes)};
    return true;
  }
  uint8_t record[kAnimatedImageFrameRecordBytesV3]{};
  const uint32_t recordOffset = kAnimatedImageAssetHeaderBytes +
      static_cast<uint32_t>(index) * info.frameRecordBytes;
  if (!file.seek(recordOffset) ||
      file.read(record, info.frameRecordBytes) != info.frameRecordBytes)
    return false;
  frame->durationMs = readLe16(record);
  frame->offset = readLe32(record + 2);
  frame->length = readLe32(record + 6);
  if (info.frameRecordBytes >= kAnimatedImageFrameRecordBytesV2) {
    frame->dirtyX = readLe16(record + 10);
    frame->dirtyY = readLe16(record + 12);
    frame->dirtyWidth = readLe16(record + 14);
    frame->dirtyHeight = readLe16(record + 16);
  } else {
    frame->dirtyX = 0;
    frame->dirtyY = 0;
    frame->dirtyWidth = info.width;
    frame->dirtyHeight = info.height;
  }
  return frame->durationMs >= 50 && frame->durationMs <= 60000 &&
         frame->length >= 3 && frame->offset <= file.size() &&
         frame->length <= file.size() - frame->offset &&
         frame->dirtyWidth && frame->dirtyHeight &&
         frame->dirtyX + frame->dirtyWidth <= info.width &&
         frame->dirtyY + frame->dirtyHeight <= info.height;
}

bool readImageAssetHeader(File &file, uint16_t *width, uint16_t *height) {
  ImageAssetInfo info;
  if (!readImageAssetInfo(file, &info)) return false;
  if (width) *width = info.width;
  if (height) *height = info.height;
  return true;
}

bool readImageAssetRowSize(File &file, uint16_t *size) {
  uint8_t bytes[2];
  if (!size || file.read(bytes, sizeof(bytes)) != sizeof(bytes)) return false;
  *size = bytes[0] | (static_cast<uint16_t>(bytes[1]) << 8);
  return true;
}

bool ImageAssetByteReader::begin(size_t offset, size_t length) {
  offset_ = 0;
  size_ = 0;
  remaining_ = length;
  return file_.seek(offset);
}

bool ImageAssetByteReader::readByte(uint8_t &value) {
  if (remaining_ == 0) return false;
  if (offset_ == size_) {
    size_ = file_.read(buffer_, min(sizeof(buffer_), remaining_));
    offset_ = 0;
    if (size_ == 0) return false;
  }
  value = buffer_[offset_++];
  --remaining_;
  return true;
}

bool ImageAssetByteReader::skipBytes(size_t length) {
  if (length > remaining_) return false;
  const size_t buffered = size_ - offset_;
  if (length <= buffered) {
    offset_ += length;
  } else {
    // file position is at the end of the read-ahead buffer.
    if (!file_.seek(file_.position() + length - buffered)) return false;
    offset_ = size_ = 0;
  }
  remaining_ -= length;
  return true;
}

bool validImageAsset(File &file, uint16_t *width, uint16_t *height) {
  ImageAssetInfo info;
  if (!readImageAssetInfo(file, &info)) return false;
  uint32_t expectedOffset = info.animated
      ? kAnimatedImageAssetHeaderBytes +
            static_cast<uint32_t>(info.frameCount) *
                info.frameRecordBytes
      : kImageAssetHeaderBytes;
  uint32_t durationMs = 0;
  for (uint16_t index = 0; index < info.frameCount; ++index) {
    ImageAssetFrame frame;
    if (!readImageAssetFrame(file, info, index, &frame) ||
        frame.offset != expectedOffset ||
        !validateImageFrame(file, info, frame)) return false;
    expectedOffset += frame.length;
    durationMs += frame.durationMs;
  }
  if (expectedOffset != file.size() ||
      (info.animated && durationMs != info.durationMs)) return false;
  if (width) *width = info.width;
  if (height) *height = info.height;
  return true;
}

ImageAssetRenderCache::~ImageAssetRenderCache() {
  for (Entry &entry : entries_) {
    if (entry.file) entry.file.close();
  }
}

void ImageAssetRenderCache::enableRowCache() {
#if defined(ESP8266)
  // Optional acceleration only. Keep networking/allocator reserve intact.
  if (ESP.getFreeHeap() < sizeof(DecodedImageRows) + 8192 ||
      ESP.getMaxFreeBlockSize() < sizeof(DecodedImageRows) + 512) return;
#endif
  decodedRows_.reset(new (std::nothrow) DecodedImageRows());
}

bool ImageAssetRenderCache::readRow(const char *assetId, uint16_t frameIndex,
                                    uint16_t row, uint16_t width,
                                    uint16_t *out) {
  if (!assetId || !out || !width || width > 240) return false;
  if (decodedRows_ && decodedRows_->copy(assetId, frameIndex, row, width, out))
    return true;
  if (!readRowWindow(assetId, frameIndex, row, width, 0, width, out))
    return false;
  if (decodedRows_)
    decodedRows_->store(assetId, frameIndex, row, width, out);
  return true;
}

bool ImageAssetRenderCache::readRowWindow(
    const char *assetId, uint16_t frameIndex, uint16_t row, uint16_t width,
    uint16_t first, uint16_t end, uint16_t *out) {
  if (!assetId || !out || !width || width > 240 || first >= end ||
      end > width) return false;
  if (first == 0 && end == width && decodedRows_ &&
      decodedRows_->copy(assetId, frameIndex, row, width, out)) return true;
  uint16_t actualWidth, height;
  File *file = open(assetId, frameIndex, &actualWidth, &height);
  if (!file || actualWidth != width || row >= height ||
      !seekRow(assetId, frameIndex, row)) return false;
  uint16_t bytes;
  if (!readImageAssetRowSize(*file, &bytes) || !bytes ||
      bytes > sizeof(encodedRow_) ||
      file->position() + bytes > file->size() ||
      file->read(encodedRow_, bytes) != bytes) return false;
  ImageAssetMemoryReader reader;
  if (!reader.begin(encodedRow_, bytes) ||
      !decodeRgb565Window(reader, width, first, end, out) || reader.remaining())
    return false;
  if (first == 0 && end == width && decodedRows_)
    decodedRows_->store(assetId, frameIndex, row, width, out);
  return true;
}

bool ImageAssetRenderCache::initializeRowIndex(Entry &entry) {
  memset(entry.rowOffsets, 0, sizeof(entry.rowOffsets));
  entry.rowOffsets[0] = entry.frameOffset;
  entry.lastRow = 0;
  entry.lastRowOffset = entry.frameOffset;
  return entry.file.seek(entry.frameOffset);
}

bool ImageAssetRenderCache::seekRow(const char *assetId, uint16_t frameIndex,
                                    uint16_t row) {
  if (!assetId || row >= 240) return false;
  for (Entry &entry : entries_) {
    if (!entry.file || strcmp(entry.id, assetId) != 0 ||
        entry.frameIndex != frameIndex || row >= entry.height) {
      continue;
    }
    const uint16_t checkpoint = row / kImageRowIndexStride;
    if (checkpoint >= kImageRowIndexEntries) return false;
    uint16_t indexedRow = 0;
    uint32_t offset = entry.frameOffset;
    for (uint16_t candidate = checkpoint; candidate > 0; --candidate) {
      if (!entry.rowOffsets[candidate]) continue;
      indexedRow = candidate * kImageRowIndexStride;
      offset = entry.rowOffsets[candidate];
      break;
    }
    if (entry.lastRow <= row && entry.lastRow >= indexedRow) {
      indexedRow = entry.lastRow;
      offset = entry.lastRowOffset;
    }
    if (!entry.file.seek(offset)) return false;
    for (uint16_t current = indexedRow; current < row; ++current) {
      uint16_t rowBytes = 0;
      if (!readImageAssetRowSize(entry.file, &rowBytes) || rowBytes == 0 ||
          entry.file.position() + rowBytes > entry.frameEnd ||
          !entry.file.seek(entry.file.position() + rowBytes)) {
        return false;
      }
      const uint16_t nextRow = current + 1;
      if (nextRow % kImageRowIndexStride == 0) {
        entry.rowOffsets[nextRow / kImageRowIndexStride] =
            entry.file.position();
      }
    }
    entry.lastRow = row;
    entry.lastRowOffset = entry.file.position();
    return true;
  }
  return false;
}

File *ImageAssetRenderCache::open(const char *assetId, uint16_t frameIndex,
                                  uint16_t *width, uint16_t *height) {
  if (!assetId || !assetId[0]) return nullptr;
  Entry *available = nullptr;
  Entry *oldest = &entries_[0];
  for (Entry &entry : entries_) {
    if (entry.file && strcmp(entry.id, assetId) == 0 &&
        entry.frameIndex == frameIndex) {
      entry.usedAt = ++useCounter_;
      if (width) *width = entry.width;
      if (height) *height = entry.height;
      return &entry.file;
    }
    if (!entry.file && available == nullptr) available = &entry;
    if (entry.usedAt < oldest->usedAt) oldest = &entry;
  }
  Entry &entry = available != nullptr ? *available : *oldest;
  if (entry.file) entry.file.close();
  entry.file = LittleFS.open(imageAssetPath(String(assetId)), "r");
  ImageAssetInfo info;
  ImageAssetFrame frame;
  if (!entry.file || !readImageAssetInfo(entry.file, &info) ||
      !readImageAssetFrame(entry.file, info, frameIndex, &frame)) {
    if (entry.file) entry.file.close();
    entry.id[0] = '\0';
    return nullptr;
  }
  entry.width = info.width;
  entry.height = info.height;
  entry.frameIndex = frameIndex;
  entry.frameOffset = frame.offset;
  entry.frameEnd = frame.offset + frame.length;
  if (!initializeRowIndex(entry)) {
    entry.file.close();
    entry.id[0] = '\0';
    return nullptr;
  }
  strlcpy(entry.id, assetId, sizeof(entry.id));
  entry.usedAt = ++useCounter_;
  if (width) *width = entry.width;
  if (height) *height = entry.height;
  return &entry.file;
}
