#pragma once

#include <Arduino.h>
#include <LittleFS.h>

#include "WebServerCompat.h"

class ImageAssetApi {
 public:
  using Authenticate = bool (*)();

  ImageAssetApi(MiniDisplayWebServer &server, bool &filesystemReady,
                Authenticate authenticate);

  void begin();

 private:
  void list();
  void download();
  void uploadChunk();
  void uploadStream();
  void finishStreamUpload();
  void remove();
  void sendError(int status, const __FlashStringHelper *error,
                 const __FlashStringHelper *message);
  uint32_t freeBytes() const;

  static ImageAssetApi *instance_;
  static void listRoute();
  static void uploadRoute();
  static void streamUploadRoute();
  static void finishStreamUploadRoute();
  static void removeRoute();

  MiniDisplayWebServer &server_;
  bool &filesystemReady_;
  Authenticate authenticate_;
  File streamFile_;
  String streamPath_;
  uint32_t streamExpectedBytes_ = 0;
  uint32_t streamWrittenBytes_ = 0;
  int streamStatus_ = 0;
};
