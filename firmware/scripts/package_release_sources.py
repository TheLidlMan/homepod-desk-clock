"""Package the exact build inputs, dependency notices and relink objects.

Run after building all release profiles. Only tracked project files are copied;
local credentials, caches and unrelated untracked files are never collected.
"""

import argparse
import io
import os
from pathlib import Path
import subprocess
import tarfile


ROOT = Path(__file__).resolve().parents[2]


def tracked_paths():
    output = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [ROOT / os.fsdecode(name) for name in output.split(b"\0") if name]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist/release-sources.tar.gz")
    parser.add_argument("--list", action="store_true", help="List inputs without creating an archive")
    args = parser.parse_args()
    core = Path(os.environ.get("PLATFORMIO_CORE_DIR", ROOT / ".platformio"))
    inputs = [(path, Path("project") / path.relative_to(ROOT)) for path in tracked_paths() if path.is_file()]
    # The patched framework is copied after compilation, not downloaded again.
    for directory, destination in [
        (core / "packages", Path("project/.platformio/packages")),
        (core / "platforms", Path("project/.platformio/platforms")),
        (ROOT / "firmware/.pio/libdeps", Path("project/firmware/.pio/libdeps")),
        (ROOT / "firmware/.pio/build", Path("project/firmware/.pio/build")),
        (ROOT / "firmware-bootstrap/.pio/libdeps", Path("project/firmware-bootstrap/.pio/libdeps")),
        (ROOT / "firmware-bootstrap/.pio/build", Path("project/firmware-bootstrap/.pio/build")),
    ]:
        if not directory.is_dir():
            raise SystemExit(f"Missing build input: {directory}; build firmware first")
        for path in sorted(directory.rglob("*")):
            if directory == core / "packages":
                package = path.relative_to(directory).parts[0]
                # Record toolchain versions, not multi-GB compiler executables.
                if not package.startswith("framework-") and path.name != "package.json":
                    continue
            if path.is_file() and not path.is_symlink() and ".git" not in path.parts:
                inputs.append((path, destination / path.relative_to(directory)))
    # Include runtime JS dependencies with their own licenses and sources.
    for frontend in ["firmware/web", "integration/card"]:
        modules = ROOT / frontend / "node_modules"
        for package in ["lit", "lit-html", "lit-element", "@lit/reactive-element"]:
            directory = modules / package
            if not (directory / "LICENSE").is_file():
                raise SystemExit(f"Missing dependency license: {directory}; run npm ci")
            for path in sorted(directory.rglob("*")):
                if path.is_file() and not path.is_symlink():
                    inputs.append((path, Path("project") / frontend / "node_modules" / path.relative_to(modules)))
    if args.list:
        for _, destination in inputs:
            print(destination)
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(args.output, "w:gz") as archive:
        for path, destination in inputs:
            archive.add(path, arcname=str(destination), recursive=False)
        revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT)
        info = tarfile.TarInfo("REVISION.txt")
        info.size = len(revision)
        archive.addfile(info, io.BytesIO(revision))
    print(f"Packaged {len(inputs)} inputs: {args.output}")


if __name__ == "__main__":
    main()
