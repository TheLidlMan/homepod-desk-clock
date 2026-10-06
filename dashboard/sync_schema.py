#!/usr/bin/env python3
"""Copy canonical schema into the HACS integration package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dashboard" / "dashboard.schema.json"
TARGET = ROOT / "custom_components" / "mini_display" / "dashboard.schema.json"


def generated() -> str:
    return json.dumps(
        json.loads(SOURCE.read_text(encoding="utf-8")),
        ensure_ascii=False,
        separators=(",", ":"),
    ) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = generated()
    if args.check:
        return 0 if TARGET.exists() and TARGET.read_text(encoding="utf-8") == content else 1
    TARGET.write_text(content, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
