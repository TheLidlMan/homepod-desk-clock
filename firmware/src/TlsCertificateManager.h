#pragma once

#include <Arduino.h>
#include <IPAddress.h>
#include <LittleFS.h>
#include "FeatureFlags.h"

#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
#include <BearSSLHelpers.h>

class TlsCertificateManager {
 public:
  bool begin(bool filesystemReady);
  bool enabled() const { return enabled_; }
  bool ready() const { return certificate_ && privateKey_; }
  bool generated() const { return generated_; }
  const char *source() const { return generated_ ? "generated" : "uploaded"; }
  const char *fingerprint() const { return fingerprint_; }
  const BearSSL::X509List *certificate() const { return certificate_; }
  const BearSSL::PrivateKey *privateKey() const { return privateKey_; }

  bool setEnabled(bool enabled);
  bool generate(const String &hostname, const IPAddress &address);
  bool beginUpload(bool certificate);
  bool writeUpload(bool certificate, const uint8_t *data, size_t length);
  void abortUpload(bool certificate);
  bool finishUpload(bool certificate);
  bool installUploads();

 private:
  bool loadCredentials();
  bool loadPair(const char *certificatePath, const char *keyPath,
                BearSSL::X509List *&certificate,
                BearSSL::PrivateKey *&privateKey);
  bool persistSettings();
  void replaceCredentials(BearSSL::X509List *certificate,
                          BearSSL::PrivateKey *privateKey, bool generated);
  void updateFingerprint();

  BearSSL::X509List *certificate_ = nullptr;
  BearSSL::PrivateKey *privateKey_ = nullptr;
  File certificateUpload_;
  File keyUpload_;
  bool filesystemReady_ = false;
  bool enabled_ = false;
  bool generated_ = false;
  char fingerprint_[96]{};
};

#else

class TlsCertificateManager {
 public:
  bool begin(bool) { return true; }
  bool enabled() const { return false; }
  bool ready() const { return false; }
  bool generated() const { return false; }
  const char *source() const { return "unsupported"; }
  const char *fingerprint() const { return ""; }
  bool setEnabled(bool) { return false; }
  bool generate(const String &, const IPAddress &) { return false; }
  bool beginUpload(bool) { return false; }
  bool writeUpload(bool, const uint8_t *, size_t) { return false; }
  void abortUpload(bool) {}
  bool finishUpload(bool) { return false; }
  bool installUploads() { return false; }
};

#endif
