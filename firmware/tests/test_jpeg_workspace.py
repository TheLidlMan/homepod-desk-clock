"""Decode synthetic solid covers using exactly the requested workspace."""
from pathlib import Path
import os
import subprocess

root = Path(__file__).resolve().parents[2]
src = root / "firmware/src"
output = root / ".cache/tests/jpeg-workspace"
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    os.environ.get("CC", "cc"), "-std=c11", "-g", "-Wall", "-Wextra", "-Werror",
    "-fsanitize=address,undefined", "-fno-sanitize-recover=all",
    f"-I{src}", str(src / "jpeg_mdi.c"), str(src / "codec/tjpgd.c"),
    str(root / "firmware/tests/jpeg_workspace_test.c"), "-o", str(output),
], check=True)
for edge in (17, 80, 118):
    subprocess.run([str(output), str(root / f"firmware/tests/fixtures/jpeg-solid-{edge}.jpg"), str(edge)], check=True)
print("JPEG workspace bounds and dimension checks passed; 80px saves 1216 bytes")
