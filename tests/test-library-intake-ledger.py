#!/usr/bin/env python3
"""Standard-library regression coverage for private Codex intake state ledger."""
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

LEDGER = Path(__file__).resolve().parents[1] / "scripts" / "case-articles" / "library-intake-ledger.py"


def call(*args):
    return subprocess.run([sys.executable, str(LEDGER), *map(str, args)], capture_output=True, text=True)


def receipt(case_id="case_example", rev="r1", article_sha="a" * 64, batch="library_example"):
    return {
        "batch_id": batch,
        "publication": False,
        "case_count": 1,
        "source_binaries_preserved": True,
        "input_zips": [{"name": "MAKEMONEY_test.zip", "sha256": "b" * 64, "bytes": 200}],
        "cases": [{
            "case_id": case_id,
            "revision": rev,
            "original_article_sha256": article_sha,
            "official_domain": "example.org",
            "entity_id": "ent_test",
            "editorial_flags": ["missing verified origin"],
        }],
    }


class LedgerTest(unittest.TestCase):
    def test_initial_receipt_then_idempotent_rerun(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            intake = root / "received" / "library_example"
            intake.mkdir(parents=True)
            p = intake / "receipt.json"
            p.write_text(json.dumps(receipt()), encoding="utf8")
            s1 = call("--root", root / "received")
            self.assertEqual(s1.returncode, 0, s1.stderr)
            j1 = json.loads(s1.stdout)
            self.assertEqual(j1["new_staged_revisions"], 1)
            self.assertEqual(j1["private_ui_verified"], 0)
            self.assertEqual(j1["published"], 0)
            ledger = root / "received" / "codex-import-ledger.json"
            t1 = ledger.read_bytes()
            s2 = call("--root", root / "received")
            self.assertEqual(s2.returncode, 0, s2.stderr)
            self.assertEqual(json.loads(s2.stdout)["new_staged_revisions"], 0)
            self.assertEqual(ledger.read_bytes(), t1)
            saved = json.loads(t1)
            case = next(iter(saved["cases"].values()))
            self.assertEqual(case["state"], "STAGED_DRAFT")
            self.assertEqual(case["real_browser_qa"], "NOT_RUN")
            self.assertEqual(case["editorial_qa"], "NOT_RUN")

    def test_conflicting_same_revision_keeps_ledger_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            intake = root / "received"
            first = intake / "b1"
            first.mkdir(parents=True)
            (first / "receipt.json").write_text(json.dumps(receipt(batch="b1")), encoding="utf8")
            self.assertEqual(call("--root", intake).returncode, 0)
            state = (intake / "codex-import-ledger.json").read_bytes()
            second = intake / "b2"
            second.mkdir()
            (second / "receipt.json").write_text(json.dumps(receipt(article_sha="f"*64, batch="b2")), encoding="utf8")
            fail = call("--root", intake)
            self.assertNotEqual(fail.returncode, 0)
            self.assertIn("same case and revision differ", fail.stderr)
            self.assertEqual((intake / "codex-import-ledger.json").read_bytes(), state)

    def test_library_listing_does_not_claim_imported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inventory = root / "inventory.json"
            inventory.write_text(json.dumps({"items": [
                {"name": "MAKEMONEY_new_r1.zip", "file_id": "file_real", "path": "/Make money/MAKEMONEY_new_r1.zip"},
                {"name": "another.md", "file_id": "other"},
            ]}), encoding="utf8")
            res = call("--root", root / "received", "--inventory", inventory)
            self.assertEqual(res.returncode, 0, res.stderr)
            result = json.loads(res.stdout)
            self.assertEqual(result["observed_library_zips"], 1)
            self.assertEqual(result["staged_revision_count"], 0)
            self.assertEqual(result["published"], 0)

    def test_publication_true_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "received" / "batch"
            root.mkdir(parents=True)
            data = receipt()
            data["publication"] = True
            (root / "receipt.json").write_text(json.dumps(data), encoding="utf8")
            res = call("--root", root.parent)
            self.assertNotEqual(res.returncode, 0)
            self.assertFalse((root.parent / "codex-import-ledger.json").exists())


if __name__ == "__main__":
    unittest.main()
