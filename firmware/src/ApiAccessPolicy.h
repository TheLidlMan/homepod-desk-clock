#pragma once

#include <stdint.h>

enum class ApiAccessPolicy : uint8_t { SetupMode, NotConfigured, Open, PasswordMissing, Authenticate };

inline ApiAccessPolicy apiAccessPolicy(bool setupMode, bool configured,
                                       bool protect, bool passwordSet) {
  if (setupMode) return ApiAccessPolicy::SetupMode;
  if (!configured) return ApiAccessPolicy::NotConfigured;
  if (!protect) return ApiAccessPolicy::Open;
  return passwordSet ? ApiAccessPolicy::Authenticate : ApiAccessPolicy::PasswordMissing;
}
