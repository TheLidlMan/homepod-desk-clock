"""Exercise encrypted event ordering using the same pinned BearSSL as firmware."""
from pathlib import Path
import os
import plistlib
import subprocess

root = Path(__file__).resolve().parents[2]
sdk = Path(os.environ.get("PLATFORMIO_CORE_DIR", root / ".platformio")) / "packages/framework-arduinoespressif8266/tools/sdk/ssl/bearssl"
src = root / "firmware/src"
sources = [src / name for name in ("hap_native.c", "hap_pair_io.c", "bplist_minimal.c", "mrp_minimal.c")]
sources += sorted((sdk / "src/int").glob("i15_*.c"))
sources += [sdk / "src" / name for name in (
    "int/i32_div32.c", "hash/sha2big.c", "kdf/hkdf.c", "mac/hmac.c",
    "codec/dec32be.c", "codec/dec64be.c", "codec/enc64be.c", "codec/ccopy.c",
    "symcipher/chacha20_ct.c", "codec/dec32le.c", "codec/enc32le.c",
    "codec/enc64le.c", "symcipher/poly1305_ctmul.c",
)]
output = root / ".cache/tests/homepod-timing"
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    os.environ.get("CC", "cc"), "-std=c11", "-Os", "-g", "-Wall", "-Wextra", "-Werror",
    "-fsanitize=address,undefined", "-fno-sanitize-recover=all", "-fno-omit-frame-pointer",
    "-DBR_LE_UNALIGNED=0", "-DBR_BE_UNALIGNED=0",
    f"-I{src}", f"-I{sdk / 'inc'}", f"-I{sdk / 'src'}",
    *map(str, sources), str(root / "firmware/tests/homepod_timing_test.c"),
    "-o", str(output),
], check=True)
wire = output.with_suffix(".bplist")
subprocess.run([str(output), str(wire)], check=True)
seed = plistlib.loads(wire.read_bytes())["streams"][0]["seed"]
assert 0 <= seed <= (1 << 63) - 1, "Wire seed must match native unsigned salt value"
print("Standard plist decoder agrees with positive stream seed")
