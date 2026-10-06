#!/usr/bin/env python3
"""Report ESP8266 RAM sections and their largest ELF symbols."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


RAM_SECTIONS = (".data", ".rodata", ".bss", ".noinit")


def output(*command: str | Path) -> str:
    return subprocess.check_output([str(part) for part in command], text=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("elf", type=Path)
    parser.add_argument("--toolchain", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=30)
    args = parser.parse_args()

    size = args.toolchain / "xtensa-lx106-elf-size"
    nm = args.toolchain / "xtensa-lx106-elf-nm"
    sections: dict[str, int] = {}
    for line in output(size, "-A", args.elf).splitlines():
        fields = line.split()
        if len(fields) >= 2 and fields[0] in RAM_SECTIONS:
            sections[fields[0]] = int(fields[1])

    print("RAM sections")
    for name in RAM_SECTIONS:
        print(f"  {name:8} {sections.get(name, 0):7} B")
    linked = sum(sections.get(name, 0) for name in (".data", ".rodata", ".bss"))
    print(f"  {'linked':8} {linked:7} B")

    symbols: list[tuple[int, str, str]] = []
    for line in output(
        nm,
        "--demangle",
        "--print-size",
        "--size-sort",
        "--radix=d",
        args.elf,
    ).splitlines():
        fields = line.split(maxsplit=3)
        if len(fields) != 4 or fields[2] not in "BbDdRr":
            continue
        symbols.append((int(fields[1]), fields[2], fields[3]))

    print(f"\nLargest {args.limit} named RAM symbols")
    for symbol_size, symbol_type, name in reversed(symbols[-args.limit :]):
        print(f"  {symbol_size:7} B  {symbol_type}  {name}")


if __name__ == "__main__":
    main()
