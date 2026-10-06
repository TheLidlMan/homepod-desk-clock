const releasesUrl =
  "https://api.github.com/repos/piotrkochan/homeassistant-minidisplay/releases?per_page=50";
const downloadRoot =
  "https://raw.githubusercontent.com/piotrkochan/homeassistant-minidisplay/firmware-downloads/firmware";
const firmwarePrefix = "SDP-HomeAssistant-MiniDisplay-";

type GitHubAsset = {
  name: string;
  size: number;
  digest?: string | null;
};

type GitHubRelease = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GitHubAsset[];
};

export type FirmwareRelease = {
  version: string;
  prerelease: boolean;
  publishedAt: string;
  fileName: string;
  size: number;
  sha256: string;
  downloadUrl: string;
};

type ParsedVersion = {
  numbers: number[];
  prerelease: string[];
};

const parseVersion = (value: string): ParsedVersion | undefined => {
  const match = value
    .trim()
    .replace(/^v/, "")
    .match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
  if (!match) return undefined;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
};

export const compareVersions = (left: string, right: string): number => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return left.localeCompare(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index])
      return a.numbers[index] - b.numbers[index];
  }
  if (!a.prerelease.length) return b.prerelease.length ? 1 : 0;
  if (!b.prerelease.length) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : undefined;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : undefined;
    if (leftNumber !== undefined && rightNumber !== undefined)
      return leftNumber - rightNumber;
    if (leftNumber !== undefined) return -1;
    if (rightNumber !== undefined) return 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
};

export const compareInstalledVersion = (
  candidate: string,
  installed: string,
): number =>
  compareVersions(
    candidate,
    installed.endsWith("-dev") ? installed.slice(0, -4) : installed,
  );

export async function fetchFirmwareReleases(): Promise<FirmwareRelease[]> {
  const response = await fetch(releasesUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok)
    throw new Error(`GitHub release check failed (${response.status})`);
  const releases = (await response.json()) as GitHubRelease[];
  return releases
    .filter((release) => !release.draft)
    .flatMap((release) => {
      const version = release.tag_name.replace(/^v/, "");
      if (!parseVersion(version)) return [];
      const fileName = `${firmwarePrefix}${version}.bin`;
      const asset = release.assets.find(
        (candidate) => candidate.name === fileName,
      );
      const digest = asset?.digest?.match(/^sha256:([0-9a-f]{64})$/i);
      if (!asset || !digest) return [];
      return [
        {
          version,
          prerelease: release.prerelease,
          publishedAt: release.published_at ?? "",
          fileName,
          size: asset.size,
          sha256: digest[1].toLowerCase(),
          downloadUrl: `${downloadRoot}/${fileName}`,
        },
      ];
    })
    .sort((a, b) => compareVersions(b.version, a.version));
}

export async function downloadFirmwareRelease(
  release: FirmwareRelease,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<File> {
  const response = await fetch(release.downloadUrl, { cache: "no-store" });
  if (!response.ok)
    throw new Error(`Firmware download failed (${response.status})`);
  if (!response.body) {
    const blob = await response.blob();
    onProgress?.(blob.size, release.size);
    return firmwareFile_(release, blob);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  onProgress?.(0, release.size);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    downloaded += value.byteLength;
    onProgress?.(downloaded, release.size);
  }
  const bytes = new Uint8Array(downloaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return firmwareFile_(release, new Blob([bytes.buffer]));
}

function firmwareFile_(release: FirmwareRelease, blob: Blob): File {
  if (blob.size !== release.size)
    throw new Error("Downloaded firmware size does not match the release");
  return new File([blob], release.fileName, {
    type: "application/octet-stream",
  });
}

export const newestStableRelease = (
  releases: FirmwareRelease[],
): FirmwareRelease | undefined =>
  releases.find((release) => !release.prerelease);
