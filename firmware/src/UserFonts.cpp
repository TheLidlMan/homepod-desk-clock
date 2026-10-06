#include "UserFonts.h"

#include <ArduinoJson.h>

#include "StoredConfig.h"
#include "StoredConfigFile.h"

namespace {

constexpr uint16_t kFontMetadataSchemaVersion = 1;
constexpr char kMetadataPath[] = "/fonts.json";
constexpr char kMetadataTempPath[] = "/fonts.tmp";
constexpr char kMetadataInvalidPath[] = "/fonts.invalid";
constexpr uint8_t kLegacyVlwVersion = 11;
constexpr uint8_t kCompactVlwVersion = 12;

const char *const kLegacyFontPaths[kUserFontSlots][kUserFontSizes] = {
    {"/font1-0.vlw", "/font1-1.vlw", "/font1-2.vlw", "/font1-3.vlw"},
    {"/font2-0.vlw", "/font2-1.vlw", "/font2-2.vlw", "/font2-3.vlw"},
};

// Firmware up to v0.2.0 only knows kLegacyFontPaths and assumes every file
// there uses 28-byte VLW v11 metrics. Keep compact files at distinct paths so
// an older firmware disables the custom slot instead of misreading VLW v12.
const char *const kCompactFontPaths[kUserFontSlots][kUserFontSizes] = {
    {"/font-v12-1-0.vlw", "/font-v12-1-1.vlw", "/font-v12-1-2.vlw",
     "/font-v12-1-3.vlw"},
    {"/font-v12-2-0.vlw", "/font-v12-2-1.vlw", "/font-v12-2-2.vlw",
     "/font-v12-2-3.vlw"},
};

const char *const kFontTempPaths[kUserFontSlots][kUserFontSizes] = {
    {"/font1-0.tmp", "/font1-1.tmp", "/font1-2.tmp", "/font1-3.tmp"},
    {"/font2-0.tmp", "/font2-1.tmp", "/font2-2.tmp", "/font2-3.tmp"},
};

const char *const kLegacyFontBaseNames[kUserFontSlots][kUserFontSizes] = {
    {"font1-0", "font1-1", "font1-2", "font1-3"},
    {"font2-0", "font2-1", "font2-2", "font2-3"},
};

const char *const kCompactFontBaseNames[kUserFontSlots][kUserFontSizes] = {
    {"font-v12-1-0", "font-v12-1-1", "font-v12-1-2", "font-v12-1-3"},
    {"font-v12-2-0", "font-v12-2-1", "font-v12-2-2", "font-v12-2-3"},
};

const char *storedFontPath(uint8_t slot, uint8_t size, bool compact) {
  if (slot >= kUserFontSlots || size >= kUserFontSizes) return "";
  return compact ? kCompactFontPaths[slot][size]
                 : kLegacyFontPaths[slot][size];
}

const char *temporaryFontPath(uint8_t slot, uint8_t size) {
  return slot < kUserFontSlots && size < kUserFontSizes
             ? kFontTempPaths[slot][size]
             : "";
}

uint32_t readBigEndian32(File &file) {
  uint32_t value = 0;
  for (uint8_t index = 0; index < 4; ++index) {
    const int byte = file.read();
    if (byte < 0) return UINT32_MAX;
    value = (value << 8) | static_cast<uint8_t>(byte);
  }
  return value;
}

uint16_t readBigEndian16(File &file) {
  const int high = file.read();
  const int low = file.read();
  if (high < 0 || low < 0) return UINT16_MAX;
  return (static_cast<uint16_t>(high) << 8) | static_cast<uint8_t>(low);
}

}  // namespace

UserFontStore userFonts;

void UserFontStore::begin(bool filesystemReady) {
  filesystemReady_ = filesystemReady;
  if (!filesystemReady_ || !load()) {
    activeSlot_ = -1;
    for (UserFontSlotInfo &info : slots_) info = UserFontSlotInfo{};
  }
  bool repaired = false;
  for (uint8_t slotIndex = 0; slotIndex < kUserFontSlots; ++slotIndex) {
    compactSlots_[slotIndex] = false;
    if (!slots_[slotIndex].installed) continue;

    uint16_t glyphCount = 0;
    uint32_t bytes = 0;
    bool compact = validatePack(slotIndex, true, kCompactVlwVersion,
                                &glyphCount, &bytes);
    if (!compact && migrateLegacyCompactPack(slotIndex)) {
      compact = validatePack(slotIndex, true, kCompactVlwVersion,
                             &glyphCount, &bytes);
    }
    const bool legacy =
        !compact && validatePack(slotIndex, false, kLegacyVlwVersion,
                                 &glyphCount, &bytes);
    if (!compact && !legacy) {
      slots_[slotIndex] = UserFontSlotInfo{};
      if (activeSlot_ == static_cast<int8_t>(slotIndex)) activeSlot_ = -1;
      repaired = true;
      continue;
    }

    compactSlots_[slotIndex] = compact;
    if (slots_[slotIndex].glyphCount != glyphCount ||
        slots_[slotIndex].bytes != bytes) {
      slots_[slotIndex].glyphCount = glyphCount;
      slots_[slotIndex].bytes = bytes;
      repaired = true;
    }
    // Never leave a compact file at a legacy path. Older firmware would read
    // it as VLW v11. Removing the inactive pack also reclaims LittleFS space.
    for (uint8_t size = 0; size < kUserFontSizes; ++size) {
      LittleFS.remove(storedFontPath(slotIndex, size, !compact));
    }
  }
  if (repaired) save();
}

const UserFontSlotInfo &UserFontStore::slot(uint8_t index) const {
  static const UserFontSlotInfo empty{};
  return index < kUserFontSlots ? slots_[index] : empty;
}

bool UserFontStore::setActiveSlot(int8_t slotIndex) {
  if (slotIndex < -1 || slotIndex >= static_cast<int8_t>(kUserFontSlots) ||
      (slotIndex >= 0 && !slots_[slotIndex].installed)) {
    return false;
  }
  activeSlot_ = slotIndex;
  return save();
}

bool UserFontStore::remove(uint8_t slotIndex) {
  if (!filesystemReady_ || slotIndex >= kUserFontSlots) return false;
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    LittleFS.remove(storedFontPath(slotIndex, size, false));
    LittleFS.remove(storedFontPath(slotIndex, size, true));
    LittleFS.remove(temporaryFontPath(slotIndex, size));
  }
  slots_[slotIndex] = UserFontSlotInfo{};
  compactSlots_[slotIndex] = false;
  if (activeSlot_ == static_cast<int8_t>(slotIndex)) activeSlot_ = -1;
  return save();
}

bool UserFontStore::beginUpload(uint8_t slotIndex, uint8_t size) {
  uploadSucceeded_ = false;
  uploadFailed_ = false;
  uploadBytes_ = 0;
  if (!filesystemReady_ || slotIndex >= kUserFontSlots ||
      size >= kUserFontSizes) {
    uploadFailed_ = true;
    return false;
  }
  uploadSlot_ = slotIndex;
  uploadSize_ = size;
  const char *path = temporaryFontPath(slotIndex, size);
  LittleFS.remove(path);
  uploadFile_ = LittleFS.open(path, "w");
  uploadFailed_ = !uploadFile_;
  return !uploadFailed_;
}

bool UserFontStore::writeUpload(const uint8_t *data, size_t length) {
  if (uploadFailed_ || !uploadFile_ ||
      uploadBytes_ + length > kMaxUserFontFileBytes) {
    uploadFailed_ = true;
    return false;
  }
  if (uploadFile_.write(data, length) != length) {
    uploadFailed_ = true;
    return false;
  }
  uploadBytes_ += length;
  return true;
}

bool UserFontStore::finishUpload() {
  if (uploadFile_) uploadFile_.close();
  uint16_t glyphCount = 0;
  uint32_t bytes = 0;
  const char *path = temporaryFontPath(uploadSlot_, uploadSize_);
  uploadSucceeded_ =
      !uploadFailed_ && validateVlw(path, &glyphCount, &bytes);
  if (!uploadSucceeded_) LittleFS.remove(path);
  return uploadSucceeded_;
}

void UserFontStore::abortUpload() {
  if (uploadFile_) uploadFile_.close();
  LittleFS.remove(temporaryFontPath(uploadSlot_, uploadSize_));
  uploadFailed_ = true;
  uploadSucceeded_ = false;
}

bool UserFontStore::finalize(uint8_t slotIndex, const char *name,
                             uint16_t glyphCount, uint32_t expectedBytes) {
  if (!filesystemReady_ || slotIndex >= kUserFontSlots || !name || !name[0] ||
      strlen(name) > 32 || glyphCount == 0 ||
      glyphCount > kMaxUserFontGlyphs) {
    return false;
  }
  uint32_t totalBytes = 0;
  uint8_t packVersion = 0;
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    uint16_t fileGlyphCount = 0;
    uint32_t fileBytes = 0;
    uint8_t fileVersion = 0;
    if (!validateVlw(temporaryFontPath(slotIndex, size), &fileGlyphCount,
                     &fileBytes, &fileVersion) ||
        fileGlyphCount != glyphCount ||
        (packVersion && fileVersion != packVersion)) {
      return false;
    }
    packVersion = fileVersion;
    totalBytes += fileBytes;
  }
  if (totalBytes > kMaxUserFontPackBytes || totalBytes != expectedBytes) {
    return false;
  }
  const bool compact = packVersion == kCompactVlwVersion;
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    const char *destination = storedFontPath(slotIndex, size, compact);
    LittleFS.remove(destination);
    if (!LittleFS.rename(temporaryFontPath(slotIndex, size), destination)) {
      return false;
    }
  }
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    LittleFS.remove(storedFontPath(slotIndex, size, !compact));
  }
  UserFontSlotInfo &info = slots_[slotIndex];
  info.installed = true;
  strlcpy(info.name, name, sizeof(info.name));
  info.glyphCount = glyphCount;
  info.bytes = totalBytes;
  compactSlots_[slotIndex] = compact;
  return save();
}

bool UserFontStore::available(uint8_t slotIndex, uint8_t size) const {
  return filesystemReady_ && slotIndex < kUserFontSlots &&
         size < kUserFontSizes && slots_[slotIndex].installed;
}

const char *UserFontStore::fontBaseName(uint8_t slotIndex, uint8_t size) const {
  if (slotIndex >= kUserFontSlots || size >= kUserFontSizes) return "";
  return compactSlots_[slotIndex] ? kCompactFontBaseNames[slotIndex][size]
                                  : kLegacyFontBaseNames[slotIndex][size];
}

bool UserFontStore::load() {
  if (!LittleFS.exists(kMetadataPath)) return true;
  File file = LittleFS.open(kMetadataPath, "r");
  if (!file) return false;
  StaticJsonDocument<384> document;
  const auto error = deserializeJson(document, file);
  file.close();
  const auto reset = [&](const __FlashStringHelper *reason) {
    Serial.print(F("Stored font metadata reset: "));
    Serial.println(reason);
    quarantineStoredConfigFile(kMetadataPath, kMetadataInvalidPath);
    activeSlot_ = -1;
    for (UserFontSlotInfo &info : slots_) info = UserFontSlotInfo{};
    save();
    return true;
  };
  if (error || !document.is<JsonObject>()) return reset(F("malformed JSON"));

  JsonObjectConst root = document.as<JsonObjectConst>();
  const StoredConfigSchema schema = inspectStoredConfigSchema(
      root, kFontMetadataSchemaVersion);
  if (schema.state == StoredConfigSchemaState::Newer) {
    return reset(F("newer schema"));
  }
  if (schema.state == StoredConfigSchemaState::Older) {
    return reset(F("unsupported older schema"));
  }
  if (schema.state == StoredConfigSchemaState::Invalid) {
    return reset(F("invalid schema"));
  }

  bool repaired = schema.legacy;
  const int active = root["active"] | -1;
  activeSlot_ = active >= -1 && active < kUserFontSlots ? active : -1;
  repaired = repaired || activeSlot_ != active;
  JsonArrayConst slots = root["slots"].as<JsonArrayConst>();
  if (slots.isNull() || slots.size() < kUserFontSlots) repaired = true;
  for (uint8_t index = 0; index < kUserFontSlots; ++index) {
    slots_[index] = UserFontSlotInfo{};
    JsonObjectConst value = slots[index].as<JsonObjectConst>();
    if (value.isNull()) {
      repaired = true;
      continue;
    }
    if (!(value["installed"] | false)) continue;
    const char *name = value["name"] | "";
    const int glyphs = value["glyphs"] | 0;
    const uint32_t bytes = value["bytes"] | 0U;
    if (!name[0] || strlen(name) > 32 || glyphs < 1 ||
        glyphs > kMaxUserFontGlyphs || !bytes ||
        bytes > kMaxUserFontPackBytes) {
      repaired = true;
      continue;
    }
    slots_[index].installed = true;
    strlcpy(slots_[index].name, name, sizeof(slots_[index].name));
    slots_[index].glyphCount = glyphs;
    slots_[index].bytes = bytes;
  }
  if (activeSlot_ >= 0 && !slots_[activeSlot_].installed) {
    activeSlot_ = -1;
    repaired = true;
  }
  if (repaired) {
    save();
  }
  return true;
}

bool UserFontStore::save() {
  if (!filesystemReady_) return false;
  File file = LittleFS.open(kMetadataTempPath, "w");
  if (!file) return false;
  StaticJsonDocument<384> document;
  document["schemaVersion"] = kFontMetadataSchemaVersion;
  document["active"] = activeSlot_;
  JsonArray slots = document.createNestedArray("slots");
  for (const UserFontSlotInfo &info : slots_) {
    JsonObject value = slots.createNestedObject();
    value["installed"] = info.installed;
    value["name"] = info.name;
    value["glyphs"] = info.glyphCount;
    value["bytes"] = info.bytes;
  }
  const bool written = serializeJson(document, file) != 0;
  file.close();
  if (!written) {
    LittleFS.remove(kMetadataTempPath);
    return false;
  }
  LittleFS.remove(kMetadataPath);
  return LittleFS.rename(kMetadataTempPath, kMetadataPath);
}

bool UserFontStore::validateVlw(const char *path, uint16_t *glyphCount,
                                uint32_t *bytes, uint8_t *formatVersion) const {
  File file = LittleFS.open(path, "r");
  if (!file) return false;
  const uint32_t fileBytes = file.size();
  const uint32_t count = readBigEndian32(file);
  const uint32_t version = readBigEndian32(file);
  const uint32_t fontSize = readBigEndian32(file);
  readBigEndian32(file);
  const uint32_t ascent = readBigEndian32(file);
  const uint32_t descent = readBigEndian32(file);
  const bool compact = version == 12;
  const uint8_t metricBytes = compact ? 7 : 28;
  if (count == 0 || count > kMaxUserFontGlyphs ||
      (!compact && version != 11) ||
      fontSize < 8 || fontSize > 48 || ascent > 64 || descent > 32 ||
      fileBytes < 24 + count * metricBytes) {
    file.close();
    return false;
  }
  uint32_t bitmapBytes = 0;
  uint32_t previousCodepoint = 0;
  for (uint16_t index = 0; index < count; ++index) {
    const uint32_t codepoint =
        compact ? readBigEndian16(file) : readBigEndian32(file);
    const uint32_t height = compact ? file.read() : readBigEndian32(file);
    const uint32_t width = compact ? file.read() : readBigEndian32(file);
    const uint32_t advance = compact ? file.read() : readBigEndian32(file);
    if (compact) {
      if (file.read() < 0 || file.read() < 0) {
        file.close();
        return false;
      }
    } else {
      readBigEndian32(file);
      readBigEndian32(file);
      readBigEndian32(file);
    }
    if (codepoint > 0xffff || (index > 0 && codepoint <= previousCodepoint) ||
        height > 64 || width > 64 || advance > 96 || height == UINT32_MAX ||
        width == UINT32_MAX || advance == UINT32_MAX ||
        bitmapBytes > UINT32_MAX - width * height) {
      file.close();
      return false;
    }
    previousCodepoint = codepoint;
    bitmapBytes += width * height;
  }
  const bool valid = 24 + count * metricBytes + bitmapBytes <= fileBytes;
  file.close();
  if (!valid) return false;
  *glyphCount = count;
  *bytes = fileBytes;
  if (formatVersion) *formatVersion = version;
  return true;
}

bool UserFontStore::validatePack(uint8_t slotIndex, bool compact,
                                 uint8_t expectedVersion,
                                 uint16_t *glyphCount,
                                 uint32_t *bytes) const {
  uint16_t commonGlyphCount = 0;
  uint32_t totalBytes = 0;
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    uint16_t fileGlyphCount = 0;
    uint32_t fileBytes = 0;
    uint8_t version = 0;
    if (!validateVlw(storedFontPath(slotIndex, size, compact),
                     &fileGlyphCount, &fileBytes, &version) ||
        version != expectedVersion ||
        (commonGlyphCount && fileGlyphCount != commonGlyphCount)) {
      return false;
    }
    commonGlyphCount = fileGlyphCount;
    totalBytes += fileBytes;
  }
  *glyphCount = commonGlyphCount;
  *bytes = totalBytes;
  return true;
}

bool UserFontStore::migrateLegacyCompactPack(uint8_t slotIndex) {
  uint16_t glyphCount = 0;
  uint32_t bytes = 0;
  if (!validatePack(slotIndex, false, kCompactVlwVersion, &glyphCount,
                    &bytes)) {
    return false;
  }
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    LittleFS.remove(storedFontPath(slotIndex, size, true));
  }
  for (uint8_t size = 0; size < kUserFontSizes; ++size) {
    if (!LittleFS.rename(storedFontPath(slotIndex, size, false),
                         storedFontPath(slotIndex, size, true))) {
      return false;
    }
  }
  return true;
}
