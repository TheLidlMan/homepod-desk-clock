"""Exercise RTC reset diagnostics with ESP8266 and non-ESP host stubs."""
from pathlib import Path
import os
import subprocess
root = Path(__file__).resolve().parents[2]
out = root / ".cache/tests"
out.mkdir(parents=True, exist_ok=True)
for name, define in [("esp", ["-DESP8266"]), ("host", [])]:
    target = out / ("runtime-checkpoint-" + name)
    subprocess.run([
        os.environ.get("CXX", "c++"), "-std=c++11", "-g", "-Wall", "-Wextra", "-Werror",
        "-fsanitize=address,undefined", "-fno-sanitize-recover=all", "-fno-omit-frame-pointer", *define,
        "-I" + str(root / "firmware/tests/crash_stubs"), "-I" + str(root / "firmware/src"),
        str(root / "firmware/tests/runtime_checkpoint_test.cpp"), str(root / "firmware/src/CrashDiagnostics.cpp"),
        "-o", str(target),
    ], check=True)
    subprocess.run([str(target)], check=True)
