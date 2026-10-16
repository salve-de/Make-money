#!/usr/bin/env python3
"""Maintain a private, durable per-case receipt ledger for ChatGPT Library intake.

This script only records proven *local staging*. It does not download from
ChatGPT Library, approve editorial quality, import into the React UI, publish,
or claim real browser verification. Codex must perform those actions separately.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "makemoney.library-intake-ledger.v1"
ALLOWED = {"PASS", "FAIL", "NOT_RUN", "BLOCKED"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict:
    obj = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(obj, dict):
        raise ValueError(f"expected JSON object in {path}")
    return obj


def write_atomic(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".ledger-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, sort_keys=True, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def normalize_inventory(payload: dict) -> list[dict]:
    data = payload.get("result", payload)
    entries = data.get("items", data.get("files", data.get("results", [])))
    if not isinstance(entries, list):
        raise ValueError("Library inventory must have an items/files/results array")
    selected = {}
    for e in entries:
        if not isinstance(e, dict):
            continue
        name = e.get("name") or e.get("file_name") or e.get("filename")
        if not isinstance(name, str) or not name.lower().endswith(".zip"):
            continue
        key = e.get("library_file_id") or e.get("file_id") or e.get("id") or e.get("path") or name
        selected[str(key)] = {
            "name": name,
            "library_file_id": e.get("library_file_id"),
            "file_id": e.get("file_id"),
            "path": e.get("path"),
            "size_bytes": e.get("size_bytes"),
            "modified_at": e.get("modified_at"),
            "intake_state": "DISCOVERED_LIBRARY_ONLY",
        }
    return sorted(selected.values(), key=lambda x: (x["name"], str(x.get("path") or "")))


def create_ledger() -> dict:
    return {
        "schema_version": SCHEMA,
        "confidential": True,
        "created_at": iso_now(),
        "updated_at": iso_now(),
        "cases": {},
        "receipts": {},
        "library_inventory": [],
        "notes": [
            "ZIP reception is not article-quality approval or real UI verification.",
            "Do not publish or commit unpublished text to a public GitHub branch.",
        ],
    }


def process(receipt_paths: list[Path], ledger: dict) -> tuple[int, int]:
    fresh_receipts, fresh_cases = 0, 0
    for p in sorted(receipt_paths):
        if not p.is_file():
            raise ValueError(f"missing receipt: {p}")
        data = p.read_bytes()
        obj = json.loads(data)
        if not isinstance(obj, dict) or not obj.get("batch_id"):
            raise ValueError(f"invalid intake receipt: {p}")
        if obj.get("publication") is not False:
            raise ValueError(f"unsafe publication state: {p}")
        if not isinstance(obj.get("cases"), list):
            raise ValueError(f"missing cases in: {p}")
        if obj.get("case_count") != len(obj["cases"]):
            raise ValueError(f"wrong case_count: {p}")
        rid = obj["batch_id"]
        d = digest(data)
        previous = ledger["receipts"].get(rid)
        if previous:
            if previous["sha256"] != d:
                raise ValueError(f"receipt changed for existing batch {rid}")
            continue
        ledger["receipts"][rid] = {
            "sha256": d,
            "path": str(p.resolve()),
            "case_count": len(obj["cases"]),
            "input_zips": obj.get("input_zips", []),
            "recorded_at": iso_now(),
        }
        fresh_receipts += 1
        for item in obj["cases"]:
            for required in ["case_id", "revision", "original_article_sha256"]:
                if not isinstance(item.get(required), str) or not item[required]:
                    raise ValueError(f"missing {required} in {p}")
            cid = item["case_id"]
            revision = item["revision"]
            article = item["original_article_sha256"]
            key = "|".join((cid, revision, article))
            # Same case/revision with different original content is a conflict.
            for k, existing in ledger["cases"].items():
                if existing["case_id"] == cid and existing["revision"] == revision and k != key:
                    raise ValueError(f"same case and revision differ: {cid} {revision}")
            if key not in ledger["cases"]:
                ledger["cases"][key] = {
                    "case_id": cid,
                    "revision": revision,
                    "article_sha256": article,
                    "official_domain": item.get("official_domain"),
                    "entity_id": item.get("entity_id"),
                    "first_received_at": iso_now(),
                    "staged_batch_id": rid,
                    "state": "STAGED_DRAFT",
                    "zip_received": "PASS",
                    "originals_preserved": "PASS" if obj.get("source_binaries_preserved") is True else "NOT_RUN",
                    "structural_conversion": "PASS",
                    "private_ui_import": "NOT_RUN",
                    "real_browser_qa": "NOT_RUN",
                    "editorial_qa": "NOT_RUN",
                    "evidence_qa": "NOT_RUN",
                    "rights_qa": "NOT_RUN",
                    "publication": "NOT_APPROVED",
                    "editorial_flags": item.get("editorial_flags", []),
                }
                fresh_cases += 1
    return fresh_receipts, fresh_cases


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default=".catalog-release-preview/library-intake")
    ap.add_argument("--ledger", default=None)
    ap.add_argument("--receipt", action="append", default=[])
    ap.add_argument("--inventory", default=None, help="JSON from an actual authorized Library listing")
    args = ap.parse_args()
    root = Path(args.root).expanduser().resolve()
    ledger_path = Path(args.ledger).expanduser().resolve() if args.ledger else root / "codex-import-ledger.json"
    original = read_json(ledger_path) if ledger_path.exists() else create_ledger()
    if original.get("schema_version") != SCHEMA:
        raise ValueError("existing ledger schema mismatch; refusing overwrite")
    # Only include receipts from the review-only intake root.
    paths = [Path(p).expanduser().resolve() for p in args.receipt] if args.receipt else list(root.glob("*/receipt.json"))
    next_ledger = json.loads(json.dumps(original))
    nr, nc = process(paths, next_ledger)
    changed = bool(nr)
    if args.inventory:
        listing = normalize_inventory(read_json(Path(args.inventory)))
        if next_ledger["library_inventory"] != listing:
            next_ledger["library_inventory"] = listing
            changed = True
    if changed or not ledger_path.exists():
        next_ledger["updated_at"] = iso_now()
        write_atomic(ledger_path, next_ledger)
    summary = {
        "ledger": str(ledger_path),
        "new_receipts": nr,
        "new_staged_revisions": nc,
        "staged_revision_count": len(next_ledger["cases"]),
        "observed_library_zips": len(next_ledger["library_inventory"]),
        "private_ui_verified": sum(x["real_browser_qa"] == "PASS" for x in next_ledger["cases"].values()),
        "editorially_approved": sum(x["editorial_qa"] == "PASS" for x in next_ledger["cases"].values()),
        "published": 0,
        "note": "This command only records staging receipts; do not call this actual UI import.",
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
