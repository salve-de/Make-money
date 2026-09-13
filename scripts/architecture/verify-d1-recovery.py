#!/usr/bin/env python3
"""Offline SQLite recovery drill for the checked-in D1 migrations; no network or real data."""
from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inventory(connection):
    schema = connection.execute(
        "SELECT type,name,tbl_name,sql FROM sqlite_master "
        "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"
    ).fetchall()
    tables = [row[1] for row in schema if row[0] == "table"]
    contents = {}
    for name in tables:
        quoted = '"' + name.replace('"', '""') + '"'
        rows = connection.execute("SELECT * FROM " + quoted).fetchall()
        # Sort full serialized records so restore is independent of insertion/physical-page order.
        contents[name] = sorted(json.dumps(row, ensure_ascii=False, default=lambda b: {'sqlite_blob_hex': b.hex()}) for row in rows)
    canonical = json.dumps({"schema": schema, "rows": contents}, ensure_ascii=False, sort_keys=True).encode()
    return {"counts": {name: len(rows) for name, rows in contents.items()}, "logical_sha256": sha256(canonical)}


def restore_empty(destination, dump, expected_sha256):
    """Refuse overwrite and verify bytes before creating a destination. Roll back failed SQL."""
    if destination.exists():
        raise FileExistsError("Restore requires a new empty destination; existing data is never overwritten")
    if sha256(dump.encode()) != expected_sha256:
        raise ValueError("Backup checksum mismatch")
    connection = sqlite3.connect(destination)
    try:
        connection.executescript(dump)
        if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("SQLite integrity check failed")
        if connection.execute("PRAGMA foreign_key_check").fetchall():
            raise RuntimeError("SQLite foreign key check failed")
    except Exception:
        connection.rollback()
        connection.close()
        raise
    connection.close()


def verify():
    migrations = sorted((ROOT / "migrations/d1").glob("*.sql"))
    if not migrations:
        raise AssertionError("No D1 migrations found")
    with tempfile.TemporaryDirectory(prefix="make-money-recovery-") as directory:
        directory = Path(directory)
        source_path = directory / "synthetic-source.sqlite"
        source = sqlite3.connect(source_path)
        for migration in migrations:
            source.executescript(migration.read_text())
        timestamp = "2026-01-01T00:00:00Z"
        # Two synthetic owners make ownership-loss visible in the logical-content hash.
        for owner in ("recovery-owner-a", "recovery-owner-b"):
            source.execute("INSERT INTO users(id,email,created_at,updated_at) VALUES(?,?,?,?)",
                           (owner, owner + "@example.invalid", timestamp, timestamp))
            source.execute("INSERT INTO bookmarks(user_id,item_type,item_id,created_at,updated_at) VALUES(?,?,?,?,?)",
                           (owner, "business", "synthetic-company", timestamp, timestamp))
            source.execute("INSERT INTO analyst_notes(user_id,entity_id,content,updated_at) VALUES(?,?,?,?)",
                           (owner, "synthetic-company", owner + "'s note\n日本語・復元確認", timestamp))
        source.execute("INSERT INTO newsletter_subscribers(id,email,source,subscribed_at) VALUES(?,?,?,?)",
                       ("synthetic-news", "subscriber@example.invalid", "recovery-drill", timestamp))
        source.execute("INSERT INTO submissions(id,user_id,business_name,url,monthly_revenue,monthly_profit,created_at) VALUES(?,?,?,?,?,?,?)",
                       ("synthetic-submission", "recovery-owner-a", "Synthetic only", "https://example.invalid", 100, -25, timestamp))
        source.execute("INSERT INTO chat_messages(id,user_id,conversation_id,role,content,created_at) VALUES(?,?,?,?,?,?)",
                       ("synthetic-message", "recovery-owner-a", "synthetic-conversation", "user", "Synthetic recovery drill", timestamp))
        source.execute("INSERT INTO synthesized_ideas(id,user_id,payload,created_at) VALUES(?,?,?,?)",
                       ("synthetic-idea", "recovery-owner-b", '{"synthetic":true}', timestamp))
        for event, kind in (("synthetic-purchase", "purchase"), ("synthetic-refund", "refund")):
            source.execute("INSERT INTO payment_events(id,resource_id,user_id,kind,occurred_at,livemode,fact,received_at) VALUES(?,?,?,?,?,?,?,?)",
                           (event, "synthetic-resource", "recovery-owner-a", kind, 1767225600, 0,
                            json.dumps({"synthetic": True, "kind": kind}), timestamp))
        source.commit()
        before = inventory(source)
        dump = "\n".join(source.iterdump()) + "\n"
        backup_hash = sha256(dump.encode())
        source.close()
        backup = directory / "backup.sql"
        backup.write_text(dump)
        assert sha256(backup.read_bytes()) == backup_hash, "Backup bytes changed on disk"
        restored_path = directory / "restored.sqlite"
        restore_empty(restored_path, backup.read_text(), backup_hash)
        with closing(sqlite3.connect(restored_path)) as restored:
            assert inventory(restored) == before, "Restore changed schema, owner data, or payment facts"

        try:
            restore_empty(restored_path, dump, backup_hash)
        except FileExistsError:
            pass
        else:
            raise AssertionError("Restore overwrote an existing destination")
        try:
            restore_empty(directory / "tampered.sqlite", dump + "-- tampered", backup_hash)
        except ValueError:
            assert not (directory / "tampered.sqlite").exists()
        else:
            raise AssertionError("Restore accepted a corrupted backup")

        # Fail after all schema/data statements but before COMMIT, then prove rollback of both.
        assert dump.rstrip().endswith("COMMIT;"), "Unexpected SQLite dump transaction format"
        broken = dump.rsplit("COMMIT;", 1)[0] + (
            "INSERT INTO payment_events(id,resource_id,kind,occurred_at,livemode,fact) "
            "VALUES('synthetic-invalid','synthetic-resource','invalid-kind',0,0,'{}');\nCOMMIT;\n"
        )
        failed_path = directory / "partial-failure.sqlite"
        try:
            restore_empty(failed_path, broken, sha256(broken.encode()))
        except sqlite3.IntegrityError:
            with closing(sqlite3.connect(failed_path)) as failed:
                assert inventory(failed)["counts"] == {}, "Partial restore left committed tables/rows"
        else:
            raise AssertionError("Fault injection did not fail")
        with closing(sqlite3.connect(source_path)) as original:
            assert inventory(original) == before, "Recovery drill mutated the source"
        return {"status": "PASS", "scope": "offline-synthetic-sqlite-only",
                "migrations": [{"file": str(p.relative_to(ROOT)), "sha256": sha256(p.read_bytes())} for p in migrations],
                "backup_sha256": backup_hash, **before,
                "checks": ["empty_restore", "schema_and_owner_payment_content_hash", "integrity_check",
                           "foreign_key_check", "refuse_overwrite", "reject_tamper", "partial_failure_rollback", "source_unchanged"],
                "temporary_artifacts": "removed", "production_restore_tested": False}


if __name__ == "__main__":
    print(json.dumps(verify(), indent=2, ensure_ascii=False))
