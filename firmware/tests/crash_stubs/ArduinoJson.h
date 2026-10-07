#pragma once
#include <cstdint>
#include <map>
#include <string>
#include <vector>
struct JsonArray {std::vector<uint32_t> *values;void add(uint32_t n){values->push_back(n);}};
struct FakeJson {std::map<std::string,uint32_t> fields;std::vector<uint32_t> addresses;};
struct JsonObject {FakeJson *data;uint32_t &operator[](const char *key){return data->fields[key];}JsonArray createNestedArray(const char *){return {&data->addresses};}};
