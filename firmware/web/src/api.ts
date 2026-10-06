export type DeviceInfo = {
  name: string;
  model: string;
  hardwareProfile: string;
  firmwareVersion: string;
  width: number;
  height: number;
};

export type DeviceStatus = {
  connected: boolean;
  ip: string;
  displayOn: boolean;
  brightness: number;
  pixelShift: number;
  refreshRateHz: number;
  notificationPosition?: string;
  notificationPositions?: string[];
  notificationCount?: number;
  notificationMaxVisible?: number;
  notificationAuthEnabled?: boolean;
  apiPasswordSet?: boolean;
  timezone: string;
  localTime: string;
  localDate: string;
  ntpServer: string;
  page: string;
  rotation: "auto" | "manual";
  uptimeSeconds: number;
  freeHeapBytes: number;
  totalHeapBytes: number;
  storageTotalBytes: number;
  storageUsedBytes: number;
  storageFreeBytes: number;
  httpsEnabled: boolean;
  httpsAvailable: boolean;
  httpsPort?: number;
  tlsCertificateSource?: "none" | "generated" | "uploaded";
  tlsCertificateAlgorithm?: string;
  tlsCertificateFingerprint?: string;
  minimumFreeHeapBytes?: number;
  wifiRssiDbm: number;
  lastValueUpdateAgeSeconds: number;
  recoverySsid: string;
  defaultFont: "builtin" | "font1" | "font2";
  fonts: { id: "font1" | "font2"; installed: boolean; name: string }[];
  pages: string[];
};

export type NetworkStatus = {
  ssid: string;
  hostname: string;
  ip: string;
  rssiDbm: number;
  gateway: string;
  dns1Current: string;
  dns2Current: string;
  channel: number;
  bssid: string;
  mac: string;
  reconnectCount: number;
  lastDisconnectReason: string;
  retryLimit: number;
  resetApiAuthOnRecovery: boolean;
  recoverySsid: string;
  recoveryPasswordSet: boolean;
  ntpServer: string;
  ntpFromDhcp: boolean;
  staticIpEnabled: boolean;
  staticIp: string;
  staticGateway: string;
  staticSubnet: string;
  staticDns1: string;
  staticDns2: string;
};

export type SecurityStatus = {
  username: string;
  apiAuthEnabled: boolean;
  otaAuthEnabled: boolean;
  directOtaEnabled: boolean;
  httpsSupported: boolean;
  httpsEnabled: boolean;
  httpsAvailable: boolean;
  httpsPort?: number;
  tlsCertificateSource?: "none" | "generated" | "uploaded";
  tlsCertificateAlgorithm?: string;
  tlsCertificateFingerprint?: string;
};

export type UserFontSlot = {
  slot: number;
  installed: boolean;
  name: string;
  glyphs: number;
  bytes: number;
};

export type UserFontsStatus = {
  active: number;
  maxSlots: number;
  maxGlyphs: number;
  maxPackBytes: number;
  sizes: number[];
  slots: UserFontSlot[];
};

export type SetupStatus = {
  configured: boolean;
  ssid: string;
  hostname: string;
  username: string;
  retryLimit: number;
  resetApiAuthOnRecovery: boolean;
  apiAuthEnabled: boolean;
  apiPasswordSet: boolean;
  otaAuthEnabled: boolean;
  otaPasswordSet: boolean;
  directOtaEnabled: boolean;
  recoverySsid: string;
  recoveryPasswordSet: boolean;
  ntpServer: string;
  ntpFromDhcp: boolean;
  staticIpEnabled: boolean;
  staticIp: string;
  gateway: string;
  subnet: string;
  dns1: string;
  dns2: string;
};

export type FirmwareSettings = {
  notificationsEnabled: boolean;
  notificationDurationSeconds: number;
  reminderHours: number;
  availableVersion: string;
  updateAvailable: boolean;
};

export class DeviceApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      signal: controller.signal,
      headers: init?.body
        ? { "Content-Type": "application/json", ...init.headers }
        : init?.headers,
    });
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    const body = await response.text();
    try {
      const payload = JSON.parse(body) as { message?: string; error?: string };
      message = payload.message ?? payload.error ?? message;
    } catch {
      message = body || message;
    }
    throw new DeviceApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function uploadFirmware(
  file: File,
  endpoint = "/api/v1/firmware",
): Promise<string> {
  const body = new FormData();
  body.append("firmware", file);
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    body,
  });
  const message = await response.text();
  if (!response.ok) {
    throw new DeviceApiError(
      response.status,
      message || `Upload failed (${response.status})`,
    );
  }
  return message;
}

export async function uploadUserFont(
  slot: number,
  size: number,
  file: Blob,
): Promise<void> {
  const body = new FormData();
  body.append("font", file, `font-${size}.vlw`);
  const response = await fetch(`/api/v1/fonts/${slot}/${size}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    body,
  });
  if (!response.ok) {
    throw new DeviceApiError(
      response.status,
      (await response.text()) || `Font upload failed (${response.status})`,
    );
  }
}

export async function uploadTlsCredential(
  kind: "certificate" | "private-key",
  file: File,
): Promise<void> {
  const body = new FormData();
  body.append(kind, file);
  const response = await fetch(`/api/v1/tls/${kind}`, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    body,
  });
  if (!response.ok) {
    throw new DeviceApiError(
      response.status,
      (await response.text()) ||
        `Credential upload failed (${response.status})`,
    );
  }
}
