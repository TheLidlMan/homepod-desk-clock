"""Check actual bundled assets and installation requests without a live device."""
import json
import struct
import sys
from unittest.mock import patch
import install_dashboard as installer


def validate_pack(slot):
    count = None
    for index in range(4):
        data = (installer.ROOT / f"assets/fonts/{slot}-{index}.vlw").read_bytes()
        glyphs, version, size, _, ascent, descent = struct.unpack_from(">6I", data)
        assert version == 12 and 8 <= size <= 48 and ascent <= 64 and descent <= 32
        assert count is None or count == glyphs
        count = glyphs
        cursor = 24 + glyphs * 7
        last = -1
        for n in range(glyphs):
            cp, height, width, advance, _, _ = struct.unpack_from(">HBBBbb", data, 24 + n * 7)
            assert cp > last and height <= 64 and width <= 64 and advance <= 64
            last = cp
            cursor += height * width
        assert cursor == len(data)
    return count


counts = [validate_pack(slot) for slot in range(2)]
calls = []
with patch.object(installer, "request", side_effect=lambda *args: calls.append(args)), \
     patch.object(sys, "argv", ["install_dashboard.py", "http://192.0.2.10"]):
    installer.main()
assert len(calls) == 14
for slot in range(2):
    request = next(c for c in calls if c[1] == f"/api/v1/fonts/{slot}")
    metadata = json.loads(request[2])
    assert metadata["glyphs"] == counts[slot]
    assert metadata["bytes"] == sum(len((installer.ROOT / f"assets/fonts/{slot}-{i}.vlw").read_bytes()) for i in range(4))
assert calls[-2][1] == "/api/v1/dashboard" and calls[-1][1] == "/api/v1/restart"
for url in ["file:///tmp/clock", "http://user:password@192.0.2.10", "http://192.0.2.10/api"]:
    with patch.object(installer, "request") as request, \
         patch.object(sys, "argv", ["install_dashboard.py", url]):
        try:
            installer.main()
            raise AssertionError("Invalid URL accepted")
        except SystemExit as error:
            assert error.code == 2
        request.assert_not_called()
print("Open font packs and dashboard installation requests passed")
