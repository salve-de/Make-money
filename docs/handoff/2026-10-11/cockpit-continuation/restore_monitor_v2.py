#!/usr/bin/env python3
"""Restore the exact delivered Monitor V2 HTML. Standard library only; no network.

Run from any directory:
  python3 path/to/cockpit-continuation/restore_monitor_v2.py --output ./restored-monitor-v2

This is archive restoration, not app deployment. Existing output files are never
replaced. The HTML includes its original CSS, JavaScript and static JSON data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import lzma
from pathlib import Path


def verify(data: bytes, expected_size: int, expected_sha256: str, label: str) -> None:
    actual = hashlib.sha256(data).hexdigest()
    if len(data) != expected_size or actual != expected_sha256:
        raise ValueError(f"{label}: size/hash mismatch: {len(data)} bytes, SHA-256 {actual}")


def restore(output_directory: Path) -> Path:
    base = Path(__file__).resolve().parent
    manifest = json.loads((base / "ARTIFACT_MANIFEST.json").read_text(encoding="utf-8"))
    archive = manifest["latest_html"]
    chunks: list[bytes] = []
    for part in archive["parts"]:
        relative = Path(part["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("Unsafe archive path")
        data = (base / relative).read_bytes()
        verify(data, part["bytes"], part["sha256"], str(relative))
        chunks.append(data)
    compressed = b"".join(chunks)
    verify(compressed, archive["compressed_bytes"], archive["compressed_sha256"], "compressed HTML")
    html = lzma.decompress(compressed, memlimit=256 * 1024 * 1024)
    verify(html, archive["bytes"], archive["sha256"], "restored HTML")
    output_directory.mkdir(parents=True, exist_ok=True)
    destination = output_directory / archive["filename"]
    with destination.open("xb") as file:
        file.write(html)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("restored-monitor-v2"))
    args = parser.parse_args()
    try:
        destination = restore(args.output)
    except (OSError, ValueError, KeyError, lzma.LZMAError) as exc:
        parser.exit(1, f"Archive restoration failed: {exc}\n")
    print(f"Restored: {destination.resolve()}")
    print("SHA-256: 4223e734aa3ab9744441ec52985372383efa33203b436ed388a33befa444c036")
    print("Static review mock only; no production changes or external API requests were made.")


if __name__ == "__main__":
    main()
