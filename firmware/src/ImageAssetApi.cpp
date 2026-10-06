#include "ImageAssetApi.h"

#include <ArduinoJson.h>
#include <LittleFS.h>

#include "ImageAssets.h"

namespace {
constexpr size_t kMaximumChunkBytes = 4096;
}

ImageAssetApi *ImageAssetApi::instance_ = nullptr;

ImageAssetApi::ImageAssetApi(MiniDisplayWebServer &server,
                             bool &filesystemReady,
                             Authenticate authenticate)
    : server_(server),
      filesystemReady_(filesystemReady),
      authenticate_(authenticate) {}

void ImageAssetApi::begin() {
  instance_ = this;
  server_.on("/api/v1/assets", HTTP_GET, listRoute);
  server_.on("/api/v1/assets", HTTP_PUT, uploadRoute);
  server_.on("/api/v1/assets/upload", HTTP_POST, finishStreamUploadRoute,
             streamUploadRoute);
  server_.on("/api/v1/assets", HTTP_DELETE, removeRoute);
}

void ImageAssetApi::listRoute() {
  if (instance_->server_.hasArg("id")) {
    instance_->download();
    return;
  }
  instance_->list();
}
void ImageAssetApi::uploadRoute() { instance_->uploadChunk(); }
void ImageAssetApi::streamUploadRoute() { instance_->uploadStream(); }
void ImageAssetApi::finishStreamUploadRoute() {
  instance_->finishStreamUpload();
}
void ImageAssetApi::removeRoute() { instance_->remove(); }

uint32_t ImageAssetApi::freeBytes() const {
  if (!filesystemReady_) return 0;
#if defined(ESP8266)
  FSInfo info;
  if (!LittleFS.info(info) || info.usedBytes >= info.totalBytes) return 0;
  return info.totalBytes - info.usedBytes;
#else
  const size_t total = LittleFS.totalBytes();
  const size_t used = LittleFS.usedBytes();
  return used < total ? total - used : 0;
#endif
}

void ImageAssetApi::sendError(int status, const __FlashStringHelper *error,
                              const __FlashStringHelper *message) {
  StaticJsonDocument<192> document;
  document["error"] = error;
  document["message"] = message;
  String body;
  serializeJson(document, body);
  server_.send(status, "application/json", body);
}

void ImageAssetApi::list() {
  if (!authenticate_()) return;
  DynamicJsonDocument document(3072);
  JsonArray assets = document.createNestedArray("assets");
#if defined(ESP8266)
  Dir directory = LittleFS.openDir("/");
  while (directory.next()) {
    const String path = directory.fileName();
    const bool leadingSlash = path.startsWith("/img_");
    if ((!leadingSlash && !path.startsWith("img_")) ||
        !path.endsWith(".mdi")) {
      continue;
    }
    File file = directory.openFile("r");
    ImageAssetInfo info;
    if (!readImageAssetInfo(file, &info)) {
      file.close();
      continue;
    }
    JsonObject asset = assets.createNestedObject();
    asset["id"] = path.substring(leadingSlash ? 5 : 4, path.length() - 4);
    asset["width"] = info.width;
    asset["height"] = info.height;
    asset["bytes"] = file.size();
    if (info.animated) {
      asset["animated"] = true;
      asset["frameCount"] = info.frameCount;
      asset["durationMs"] = info.durationMs;
    }
    file.close();
  }
#else
  File root = LittleFS.open("/");
  File file = root.openNextFile();
  while (file) {
    const String path = file.name();
    if (path.startsWith("/img_") && path.endsWith(".mdi")) {
      ImageAssetInfo info;
      if (readImageAssetInfo(file, &info)) {
        JsonObject asset = assets.createNestedObject();
        asset["id"] = path.substring(5, path.length() - 4);
        asset["width"] = info.width;
        asset["height"] = info.height;
        asset["bytes"] = file.size();
        if (info.animated) {
          asset["animated"] = true;
          asset["frameCount"] = info.frameCount;
          asset["durationMs"] = info.durationMs;
        }
      }
    }
    file.close();
    file = root.openNextFile();
  }
  root.close();
#endif
  document["freeBytes"] = freeBytes();
  document["reserveBytes"] = kImageStorageReserveBytes;
  String body;
  body.reserve(2048);
  serializeJson(document, body);
  server_.send(200, "application/json", body);
}

void ImageAssetApi::download() {
  if (!authenticate_()) return;
  if (!filesystemReady_) {
    sendError(503, F("filesystem_unavailable"), F("LittleFS unavailable"));
    return;
  }
  const String id = server_.arg("id");
  if (!validImageAssetId(id)) {
    sendError(422, F("invalid_asset_id"),
              F("Expected 16 lowercase hex characters"));
    return;
  }
  File file = LittleFS.open(imageAssetPath(id), "r");
  ImageAssetInfo info;
  if (!file || !readImageAssetInfo(file, &info)) {
    if (file) file.close();
    sendError(404, F("asset_not_found"), F("Image asset not found"));
    return;
  }
  file.seek(0);
  server_.streamFile(file, "application/octet-stream");
  file.close();
}

void ImageAssetApi::uploadChunk() {
  if (!authenticate_()) return;
  if (!filesystemReady_) {
    sendError(503, F("filesystem_unavailable"), F("LittleFS unavailable"));
    return;
  }
  const String id = server_.arg("id");
  const String body = server_.arg("plain");
  const uint32_t offset = strtoul(server_.arg("offset").c_str(), nullptr, 10);
  const uint32_t total = strtoul(server_.arg("total").c_str(), nullptr, 10);
  if (!validImageAssetId(id)) {
    sendError(422, F("invalid_asset_id"),
              F("Expected 16 lowercase hex characters"));
    return;
  }
  if (body.isEmpty() || body.length() > kMaximumChunkBytes ||
      total < kImageAssetHeaderBytes || total > kMaxImageAssetBytes ||
      offset + body.length() > total) {
    sendError(413, F("invalid_asset_chunk"),
              F("Image chunk exceeds device limit"));
    return;
  }
  const String path = imageAssetPath(id);
  const String temporaryPath = path + ".tmp";
  if (offset == 0) {
    LittleFS.remove(temporaryPath);
    if (freeBytes() < total + kImageStorageReserveBytes) {
      sendError(507, F("storage_reserve"),
                F("Not enough space after safety reserve"));
      return;
    }
  }
  File temporary = LittleFS.open(temporaryPath, offset == 0 ? "w" : "a");
  if (!temporary || temporary.size() != offset) {
    if (temporary) temporary.close();
    LittleFS.remove(temporaryPath);
    sendError(409, F("chunk_offset"),
              F("Restart image upload from offset zero"));
    return;
  }
  const size_t written = temporary.write(
      reinterpret_cast<const uint8_t *>(body.c_str()), body.length());
  temporary.close();
  if (written != body.length()) {
    LittleFS.remove(temporaryPath);
    sendError(507, F("write_failed"), F("Could not store image chunk"));
    return;
  }
  if (offset + body.length() < total) {
    server_.send(204);
    return;
  }
  File validation = LittleFS.open(temporaryPath, "r");
  const bool valid = validImageAsset(validation);
  if (validation) validation.close();
  if (!valid) {
    LittleFS.remove(temporaryPath);
    sendError(422, F("invalid_asset"), F("Invalid Mini Display image"));
    return;
  }
  LittleFS.remove(path);
  if (!LittleFS.rename(temporaryPath, path)) {
    LittleFS.remove(temporaryPath);
    sendError(507, F("commit_failed"), F("Could not activate image"));
    return;
  }
  server_.send(204);
}

void ImageAssetApi::uploadStream() {
  if (!authenticate_()) return;
  HTTPUpload &upload = server_.upload();
  if (upload.status == UPLOAD_FILE_START) {
    if (streamFile_) streamFile_.close();
    if (streamPath_.length()) LittleFS.remove(streamPath_);
    streamPath_ = String();
    streamExpectedBytes_ = 0;
    streamWrittenBytes_ = 0;
    streamStatus_ = 422;
    if (!filesystemReady_) {
      streamStatus_ = 503;
      return;
    }
    const String id = server_.arg("id");
    const String totalValue = server_.arg("total");
    const uint32_t total = strtoul(totalValue.c_str(), nullptr, 10);
    if (!validImageAssetId(id) || total < kImageAssetHeaderBytes ||
        total > kMaxImageAssetBytes) {
      return;
    }
    if (freeBytes() < total + kImageStorageReserveBytes) {
      streamStatus_ = 507;
      return;
    }
    streamPath_ = imageAssetPath(id) + ".tmp";
    LittleFS.remove(streamPath_);
    streamFile_ = LittleFS.open(streamPath_, "w");
    if (!streamFile_) {
      streamStatus_ = 507;
      return;
    }
    streamExpectedBytes_ = total;
    streamStatus_ = 100;
    return;
  }
  if (upload.status == UPLOAD_FILE_WRITE) {
    if (streamStatus_ != 100 || !streamFile_ ||
        upload.currentSize > streamExpectedBytes_ - streamWrittenBytes_) {
      streamStatus_ = 422;
      return;
    }
    const size_t written = streamFile_.write(upload.buf, upload.currentSize);
    streamWrittenBytes_ += written;
    if (written != upload.currentSize) streamStatus_ = 507;
    yield();
    return;
  }
  if (upload.status == UPLOAD_FILE_ABORTED) {
    if (streamFile_) streamFile_.close();
    if (streamPath_.length()) LittleFS.remove(streamPath_);
    streamStatus_ = 422;
    return;
  }
  if (upload.status != UPLOAD_FILE_END) return;
  if (streamFile_) streamFile_.close();
  if (streamStatus_ != 100 || streamWrittenBytes_ != streamExpectedBytes_) {
    if (streamPath_.length()) LittleFS.remove(streamPath_);
    if (streamStatus_ == 100) streamStatus_ = 422;
    return;
  }
  File validation = LittleFS.open(streamPath_, "r");
  const bool valid = validImageAsset(validation);
  if (validation) validation.close();
  if (!valid) {
    LittleFS.remove(streamPath_);
    streamStatus_ = 422;
    return;
  }
  const String targetPath = streamPath_.substring(0, streamPath_.length() - 4);
  LittleFS.remove(targetPath);
  if (!LittleFS.rename(streamPath_, targetPath)) {
    LittleFS.remove(streamPath_);
    streamStatus_ = 507;
    return;
  }
  streamPath_ = String();
  streamStatus_ = 204;
}

void ImageAssetApi::finishStreamUpload() {
  if (!authenticate_()) return;
  const int status = streamStatus_;
  streamStatus_ = 0;
  streamExpectedBytes_ = 0;
  streamWrittenBytes_ = 0;
  if (status == 204) {
    server_.send(204);
  } else if (status == 503) {
    sendError(503, F("filesystem_unavailable"), F("LittleFS unavailable"));
  } else if (status == 507) {
    sendError(507, F("storage_reserve"),
              F("Not enough space after safety reserve"));
  } else {
    sendError(422, F("invalid_asset"), F("Invalid Mini Display image"));
  }
}

void ImageAssetApi::remove() {
  if (!authenticate_()) return;
  const String id = server_.arg("id");
  if (!validImageAssetId(id)) {
    sendError(422, F("invalid_asset_id"),
              F("Expected 16 lowercase hex characters"));
    return;
  }
  const String path = imageAssetPath(id);
  if (!LittleFS.exists(path)) {
    server_.send(204);
    return;
  }
  if (!LittleFS.remove(path)) {
    sendError(507, F("delete_failed"), F("Could not delete image"));
    return;
  }
  server_.send(204);
}
