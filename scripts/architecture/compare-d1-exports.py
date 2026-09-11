#!/usr/bin/env python3
"""Compare a trusted D1 backup with a restored D1 export without printing record contents."""
import argparse
from contextlib import closing
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3

spec = importlib.util.spec_from_file_location('recovery', Path(__file__).with_name('verify-d1-recovery.py'))
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


def inspect_export(payload):
    with closing(sqlite3.connect(':memory:')) as connection:
        # A SQL backup is executable input. It must never attach or modify disk databases.
        connection.set_authorizer(lambda action, *_: sqlite3.SQLITE_DENY if action in
                                  (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK)
        connection.executescript(payload.decode('utf-8'))
        if connection.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('SQLite integrity check failed')
        if connection.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Foreign key check failed')
        return recovery.inventory(connection)


def compare(original, restored, expected_sha256):
    if hashlib.sha256(original).hexdigest() != expected_sha256:
        raise ValueError('Original backup checksum mismatch')
    before, after = inspect_export(original), inspect_export(restored)
    if before != after:
        raise ValueError('Restored schema or record contents differ')
    return {'status': 'PASS', 'scope': 'D1 export schema and all rows',
            'backup_sha256': expected_sha256,
            'restored_export_sha256': hashlib.sha256(restored).hexdigest(), **after}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('original', type=Path)
    parser.add_argument('restored', type=Path)
    parser.add_argument('--expected-sha256', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(compare(args.original.read_bytes(), args.restored.read_bytes(), args.expected_sha256), indent=2))
    except (ValueError, sqlite3.Error, OSError, UnicodeError):
        raise SystemExit('Comparison failed: invalid backup, checksum, schema or record contents; no payload logged') from None
