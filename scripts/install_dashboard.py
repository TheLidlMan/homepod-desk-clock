"""Install the desk-clock dashboard/fonts on an already-provisioned SD PRO."""
import argparse
import json
import os
import struct
from pathlib import Path
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]


def request(base, path, data, method, content_type="application/json"):
    headers = {"Content-Type": content_type}
    if os.environ.get("CLOCK_API_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["CLOCK_API_TOKEN"]
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status not in (200, 204):
            raise RuntimeError(f"{path}: HTTP {response.status}")


def upload(base, path, data, filename):
    boundary = "DeskClock" + uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()
    body += data + f"\r\n--{boundary}--\r\n".encode()
    request(base, path, body, "POST", "multipart/form-data; boundary=" + boundary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("device", help="Device base URL, for example http://192.168.1.101")
    args = parser.parse_args()
    parsed = urllib.parse.urlsplit(args.device)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        parser.error("Use an HTTP(S) base URL without credentials, path or query")
    base = args.device.rstrip("/")
    # Read/validate every local asset before the first device write.
    fonts = [[(ROOT / f"assets/fonts/{slot}-{size}.vlw").read_bytes()
              for size in range(4)] for slot in range(2)]
    divider = (ROOT / "assets/divider.mdi").read_bytes()
    dashboard = (ROOT / "dashboard/desk-clock.json").read_bytes()
    json.loads(dashboard)
    for slot, name in enumerate(("Desk Rounded", "Desk Text")):
        for size, data in enumerate(fonts[slot]):
            upload(base, f"/api/v1/fonts/{slot}/{size}", data, "font.vlw")
        request(base, f"/api/v1/fonts/{slot}", json.dumps({
            "name": name, "glyphs": struct.unpack_from(">I", fonts[slot][0])[0],
            "bytes": sum(map(len, fonts[slot])),
        }).encode(), "PUT")
    request(base, "/api/v1/fonts", b'{"active":-1}', "PUT")
    upload(base, "/api/v1/assets/upload?" + urllib.parse.urlencode(
        {"id": "0000000000000002", "total": len(divider)}), divider, "divider.mdi")
    request(base, "/api/v1/dashboard", dashboard, "PUT")
    # Restart once so a HomePod already playing selects the new music page.
    request(base, "/api/v1/restart", b"{}", "POST")
    print("Dashboard and open fonts installed; the clock is restarting.")


if __name__ == "__main__":
    main()
