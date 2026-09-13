import hashlib
import importlib.util
from pathlib import Path
import sqlite3
import unittest

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).with_name('compare-d1-exports.py'))
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


class ExportComparisonTest(unittest.TestCase):
    original = b"CREATE TABLE notes(owner TEXT PRIMARY KEY, body TEXT); INSERT INTO notes VALUES('a','private A'); INSERT INTO notes VALUES('b','private B');"

    def check(self, restored):
        return comparison.compare(self.original, restored, hashlib.sha256(self.original).hexdigest())

    def test_row_order_does_not_change_logical_contents(self):
        restored = b"CREATE TABLE notes(owner TEXT PRIMARY KEY, body TEXT); INSERT INTO notes VALUES('b','private B'); INSERT INTO notes VALUES('a','private A');"
        self.assertEqual(self.check(restored)['status'], 'PASS')

    def test_same_counts_cannot_hide_owner_content_changes(self):
        with self.assertRaises(ValueError):
            self.check(self.original.replace(b'private A', b'private C'))

    def test_schema_changes_are_rejected(self):
        with self.assertRaises(ValueError):
            self.check(self.original.replace(b'body TEXT', b'body BLOB'))

    def test_blob_and_same_hex_text_are_not_equal(self):
        original = b"CREATE TABLE items(value BLOB); INSERT INTO items VALUES(X'01');"
        restored = b"CREATE TABLE items(value BLOB); INSERT INTO items VALUES('01');"
        with self.assertRaises(ValueError):
            comparison.compare(original, restored, hashlib.sha256(original).hexdigest())

    def test_tampered_backup_rejected_before_execution(self):
        with self.assertRaises(ValueError):
            comparison.compare(b'invalid SQL', self.original, '0' * 64)

    def test_sql_cannot_attach_another_database(self):
        with self.assertRaises(sqlite3.DatabaseError):
            comparison.inspect_export(b"ATTACH DATABASE ':memory:' AS other;")
