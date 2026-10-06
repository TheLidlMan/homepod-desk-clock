#pragma once

#include "FeatureFlags.h"

#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS

#include <ESP8266WebServer.h>
#include <ESP8266WebServerSecure.h>
#include "RequestBodyWebServer.h"

class DualWebServer {
 public:
  using Handler = ESP8266WebServer::THandlerFunction;

  DualWebServer(uint16_t httpPort, uint16_t httpsPort)
      : http_(httpPort), httpsPort_(httpsPort) {}

  ~DualWebServer() { delete https_; }

  void configureTls(const BearSSL::X509List *certificate,
                    const BearSSL::PrivateKey *privateKey) {
    tlsReady_ = certificate && privateKey;
    if (!tlsReady_) return;
    if (!https_) https_ = new SecureServer(httpsPort_);
    if (!https_) {
      tlsReady_ = false;
      return;
    }
    https_->getServer().setECCert(certificate,
                                  BR_KEYTYPE_KEYX | BR_KEYTYPE_SIGN,
                                  privateKey);
    https_->getServer().setSSLVersion(BR_TLS12, BR_TLS12);
  }

  bool tlsReady() const { return tlsReady_; }
  bool secureRequest() const { return secureRequest_; }

  void begin() {
    http_.begin();
    if (tlsReady_) https_->begin();
  }

  void handleClient() {
    http_.handleClient();
    if (tlsReady_) https_->handleClient();
  }

  void on(const Uri &uri, HTTPMethod method, Handler handler) {
    http_.on(uri, method, wrap_(false, handler));
    if (tlsReady_) https_->on(uri, method, wrap_(true, handler));
  }

  void on(const Uri &uri, HTTPMethod method, Handler handler,
          Handler uploadHandler) {
    http_.on(uri, method, wrap_(false, handler),
             wrap_(false, uploadHandler));
    if (tlsReady_) {
      https_->on(uri, method, wrap_(true, handler),
                 wrap_(true, uploadHandler));
    }
  }

  void onNotFound(Handler handler) {
    http_.onNotFound(wrap_(false, handler));
    if (tlsReady_) https_->onNotFound(wrap_(true, handler));
  }

  bool authenticate(const char *username, const char *password) {
    return secureRequest_ ? https_->authenticate(username, password)
                          : http_.authenticate(username, password);
  }

  void requestAuthentication() {
    if (secureRequest_)
      https_->requestAuthentication();
    else
      http_.requestAuthentication();
  }

  const String &arg(const String &name) const {
    return secureRequest_ ? https_->arg(name) : http_.arg(name);
  }

  void releaseRequestBody() {
    if (secureRequest_) https_->releaseRequestBody();
    else http_.releaseRequestBody();
  }

  template <typename Callback>
  void prepareDashboardRequests(Callback callback) {
    http_.prepareDashboardRequests(callback);
    if (tlsReady_) https_->prepareDashboardRequests(callback);
  }

  const String &header(const String &name) const {
    return secureRequest_ ? https_->header(name) : http_.header(name);
  }

  const String &uri() const {
    return secureRequest_ ? https_->uri() : http_.uri();
  }

  HTTPUpload &upload() {
    return secureRequest_ ? https_->upload() : http_.upload();
  }

  void send(int code) {
    if (secureRequest_)
      https_->send(code);
    else
      http_.send(code);
  }

  void send(int code, const char *contentType, const String &content) {
    if (secureRequest_)
      https_->send(code, contentType, content);
    else
      http_.send(code, contentType, content);
  }

  void send(int code, const char *contentType, const char *content) {
    if (secureRequest_)
      https_->send(code, contentType, content);
    else
      http_.send(code, contentType, content);
  }

  void sendHeader(const String &name, const String &value,
                  bool first = false) {
    if (secureRequest_)
      https_->sendHeader(name, value, first);
    else
      http_.sendHeader(name, value, first);
  }

  void setContentLength(size_t contentLength) {
    if (secureRequest_)
      https_->setContentLength(contentLength);
    else
      http_.setContentLength(contentLength);
  }

  Print &client() {
    return secureRequest_ ? static_cast<Print &>(https_->client())
                          : static_cast<Print &>(http_.client());
  }

  void send_P(int code, PGM_P contentType, PGM_P content,
              size_t contentLength) {
    if (secureRequest_)
      https_->send_P(code, contentType, content, contentLength);
    else
      http_.send_P(code, contentType, content, contentLength);
  }

  template <typename FileType>
  size_t streamFile(FileType &file, const String &contentType) {
    return secureRequest_ ? https_->streamFile(file, contentType)
                          : http_.streamFile(file, contentType);
  }

 private:
  Handler wrap_(bool secure, Handler handler) {
    return [this, secure, handler] {
      secureRequest_ = secure;
      handler();
    };
  }

  using SecureServer = RequestBodyWebServer<BearSSL::ESP8266WebServerSecure>;
  RequestBodyWebServer<ESP8266WebServer> http_;
  SecureServer *https_ = nullptr;
  uint16_t httpsPort_;
  bool tlsReady_ = false;
  bool secureRequest_ = false;
};

#endif
