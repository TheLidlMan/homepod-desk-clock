export const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`]
    .filter(Boolean)
    .join(" ");
};

export const formatMemory = (bytes: number) =>
  `${(bytes / 1024).toFixed(1)} KB`;

export const signalQuality = (rssi: number) => {
  if (rssi >= -50) return "Excellent";
  if (rssi >= -60) return "Good";
  if (rssi >= -70) return "Fair";
  return "Weak";
};

type TimezoneGroup = {
  label: string;
  zones: readonly { label: string; value: string }[];
};

export const timezoneGroups: readonly TimezoneGroup[] = [
  {
    label: "Africa",
    zones: [
      { label: "Johannesburg", value: "SAST-2" },
      { label: "Lagos", value: "WAT-1" },
      { label: "Nairobi", value: "EAT-3" },
    ],
  },
  {
    label: "Americas",
    zones: [
      { label: "Anchorage", value: "AKST9AKDT,M3.2.0,M11.1.0" },
      { label: "Buenos Aires, São Paulo", value: "<-03>3" },
      { label: "Chicago", value: "CST6CDT,M3.2.0/2,M11.1.0/2" },
      { label: "Denver", value: "MST7MDT,M3.2.0/2,M11.1.0/2" },
      { label: "Honolulu", value: "HST10" },
      { label: "Los Angeles", value: "PST8PDT,M3.2.0/2,M11.1.0/2" },
      { label: "New York", value: "EST5EDT,M3.2.0/2,M11.1.0/2" },
      { label: "Phoenix", value: "MST7" },
    ],
  },
  {
    label: "Asia",
    zones: [
      { label: "Dubai", value: "<+04>-4" },
      { label: "Hong Kong", value: "HKT-8" },
      { label: "Kolkata", value: "IST-5:30" },
      { label: "Shanghai", value: "CST-8" },
      { label: "Singapore", value: "SGT-8" },
      { label: "Tokyo", value: "JST-9" },
    ],
  },
  {
    label: "Australia and Pacific",
    zones: [
      { label: "Adelaide", value: "ACST-9:30ACDT,M10.1.0,M4.1.0/3" },
      { label: "Auckland", value: "NZST-12NZDT,M9.5.0,M4.1.0/3" },
      { label: "Brisbane", value: "AEST-10" },
      { label: "Perth", value: "AWST-8" },
      { label: "Sydney", value: "AEST-10AEDT,M10.1.0,M4.1.0/3" },
    ],
  },
  {
    label: "Europe",
    zones: [
      {
        label: "Athens, Helsinki",
        value: "EET-2EEST,M3.5.0/3,M10.5.0/4",
      },
      {
        label: "Berlin, Madrid, Paris, Rome, Warsaw",
        value: "CET-1CEST,M3.5.0,M10.5.0/3",
      },
      { label: "Istanbul", value: "<+03>-3" },
      { label: "London", value: "GMT0BST,M3.5.0/1,M10.5.0" },
      { label: "Moscow", value: "MSK-3" },
    ],
  },
  { label: "Universal", zones: [{ label: "UTC", value: "UTC0" }] },
];

export const timezones = timezoneGroups.flatMap((group) => group.zones);
export const defaultTimezone = "CET-1CEST,M3.5.0,M10.5.0/3";

export const timezonePreset = (rule: string) =>
  timezones.some((timezone) => timezone.value === rule)
    ? rule
    : defaultTimezone;

export const lastUpdateAge = (seconds: number) => {
  if (seconds < 0) return { text: "Never", tone: "stale" };
  if (seconds < 60) return { text: `${seconds}s ago`, tone: "fresh" };
  if (seconds < 3600)
    return {
      text: `${Math.floor(seconds / 60)}m ago`,
      tone: seconds >= 300 ? "stale" : "warning",
    };
  if (seconds < 86400)
    return { text: `${Math.floor(seconds / 3600)}h ago`, tone: "stale" };
  return { text: `${Math.floor(seconds / 86400)}d ago`, tone: "stale" };
};
