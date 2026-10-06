#pragma once

#include <ArduinoJson.h>
#include <stdint.h>

#include "DisplayDataResponse.h"

template <typename Sink, uint8_t MaximumDepth = 4>
class JsonStreamWriter {
 public:
  explicit JsonStreamWriter(Sink &sink) : writer_(sink) {}

  void begin() {
    depth_ = 1;
    first_[0] = true;
    closing_[0] = '}';
    writer_.literal("{");
  }

  template <typename Value>
  void field(const char *name, const Value &value) {
    writeName(name);
    scalar_.set(value);
    serializeJson(scalar_, writer_);
  }

  void field(const char *name, const String &value) {
    field(name, value.c_str());
  }

  void beginArray(const char *name) {
    writeName(name);
    open('[', ']');
  }

  void beginObject() {
    separate();
    open('{', '}');
  }

  template <typename Value>
  void element(const Value &value) {
    separate();
    scalar_.set(value);
    serializeJson(scalar_, writer_);
  }

  void element(const String &value) { element(value.c_str()); }

  void end() {
    if (depth_ == 0) return;
    writer_.write(static_cast<uint8_t>(closing_[--depth_]));
  }

  void finish() {
    while (depth_) end();
    writer_.flush();
  }

 private:
  void separate() {
    if (!first_[depth_ - 1]) writer_.literal(",");
    first_[depth_ - 1] = false;
  }

  void writeName(const char *name) {
    separate();
    scalar_.set(name);
    serializeJson(scalar_, writer_);
    writer_.literal(":");
  }

  void open(char opening, char closing) {
    if (depth_ >= MaximumDepth) return;
    writer_.write(static_cast<uint8_t>(opening));
    closing_[depth_] = closing;
    first_[depth_] = true;
    ++depth_;
  }

  DisplayDataWriter<Sink> writer_;
  StaticJsonDocument<16> scalar_;
  char closing_[MaximumDepth]{};
  bool first_[MaximumDepth]{};
  uint8_t depth_ = 0;
};
