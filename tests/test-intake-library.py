#!/usr/bin/env python3
"""Integration tests of real-bytes offline Library ZIP handoff (no service calls)."""
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/"scripts"/"case-articles"/"intake-library.py"
CID="case_"+hashlib.sha256(b"example.org").hexdigest()
BASE_ARTICLE="""# 公式の実在事業｜創業者が最初の客を見つけた

製品を実際に顧客へ販売した。[S01]

## 概要

### 実物を売っている

製品を企業へ提供している。[S01]

## 仕組み

1. 購入者が販売ページを開く。[S01]
2. 購入者が料金を支払う。[S01]

## お金

| 商品 | 価格 |
| --- | ---: |
| 単発の製品 | 1000円 [S01] |

## 集客

創業者が直接メールで営業した。[S01]

## 経緯

2021年に発売した。[S01]

## 成功の理由

法人から継続注文が入るようになった。[S01]

## 出典

- [S01] https://example.org/founder
"""

def dataset(article=BASE_ARTICLE, revision="r1", case_id=CID, domain="example.org"):
    research={"case_id":case_id,"official_domain":domain,"revision":revision,
             "official_url":"https://"+domain,
             "sources":[{"id":"S01","url":"https://example.org/founder","title":"創業者の当時の記録"}]}
    index={"case_id":case_id,"official_domain":domain,"revision":revision,"title":"公式の実在事業"}
    def dump(x):return json.dumps(x,ensure_ascii=False).encode()
    return {"article.md":article.encode("utf8"),"research-rights.json":dump(research),"index.json":dump(index)}

def write_zip(path, files, prefix=""):
    with zipfile.ZipFile(path,"w",compression=zipfile.ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(prefix+name,data)

def run(*a):
    return subprocess.run([sys.executable,str(SCRIPT),*map(str,a)],capture_output=True,text=True)

class TestLibraryIntake(unittest.TestCase):
    def test_original_preserved_convert_draft_and_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td); original=t/"case.zip"; write_zip(original,dataset())
            out=t/"private";p=run("--input",original,"--out",out)
            self.assertEqual(p.returncode,0,p.stderr);value=json.loads(p.stdout)
            self.assertEqual(value["status"],"STAGED_REVIEW_ONLY")
            target=out/value["batch_id"]
            self.assertEqual((target/"original-zips"/"000_case.zip").read_bytes(),original.read_bytes())
            self.assertFalse(value["publication"])
            receipt=json.loads((target/"receipt.json").read_text())
            self.assertEqual(receipt["real_UI_test"],"NOT_RUN")
            with zipfile.ZipFile(target/"case-batch-review-only.zip") as z:
                m=json.loads(z.read("batch-manifest.json"));self.assertEqual(m["format"],"makemoney.case-batch.v1")
                cid=m["cases"][0]["entity_id"]
                article=json.loads(z.read(f"cases/{cid}/article.json"))
                research=json.loads(z.read(f"cases/{cid}/research.json"))
                self.assertEqual(article["reviewState"],"draft")
                self.assertEqual(article["basedOn"]["submissionSha256"],hashlib.sha256(z.read(f"cases/{cid}/research.json")).hexdigest())
                self.assertEqual(article["topics"][-1]["id"],"reasons")
                self.assertEqual(article["sources"][0]["url"],"https://example.org/founder")
                self.assertTrue(research["records"])
            p2=run("--input",original,"--out",out)
            self.assertEqual(p2.returncode,0,p2.stderr)
            self.assertEqual(json.loads(p2.stdout)["new_cases"],0)
            self.assertEqual(len(list(out.iterdir())),1)

    def test_single_and_cumulative_zip_do_not_double_count(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);a=t/"a.zip";b=t/"b.zip";data=dataset()
            write_zip(a,data)
            write_zip(b,data,"cases/Test_r1/")
            p=run("--input",a,"--input",b,"--out",t/"staging")
            self.assertEqual(p.returncode,0,p.stderr)
            receipt=json.loads((t/"staging"/json.loads(p.stdout)["batch_id"]/"receipt.json").read_text())
            self.assertEqual(receipt["case_count"],1)
            self.assertEqual(len(receipt["duplicates_skipped"]),1)

    def test_conflicting_same_revision_blocks_without_writing(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);a=t/"a.zip";b=t/"b.zip";write_zip(a,dataset())
            write_zip(b,dataset(BASE_ARTICLE.replace("直接メール", "雑誌広告")))
            p=run("--input",a,"--input",b,"--out",t/"staging")
            self.assertNotEqual(p.returncode,0)
            self.assertIn("same case and revision differ",p.stderr)
            self.assertFalse((t/"staging").exists())

    def test_revision_history_kept_and_newest_selected(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);a=t/"a.zip";b=t/"b.zip";write_zip(a,dataset())
            write_zip(b,dataset(BASE_ARTICLE.replace("2021年", "2022年"),revision="r2"))
            p=run("--input",a,"--input",b,"--out",t/"staging")
            self.assertEqual(p.returncode,0,p.stderr)
            target=t/"staging"/json.loads(p.stdout)["batch_id"]
            self.assertEqual(len(list((target/"original-zips").glob("*.zip"))),2)
            self.assertEqual(json.loads((target/"receipt.json").read_text())["cases"][0]["revision"],"r2")

    def test_zip_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);bad=t/"unsafe.zip"
            with zipfile.ZipFile(bad,"w") as z:
                z.writestr("../danger.txt","bad")
                for n,b in dataset().items():z.writestr(n,b)
            p=run("--input",bad,"--out",t/"staging")
            self.assertNotEqual(p.returncode,0)
            self.assertIn("unsafe ZIP path",p.stderr)

    def test_missing_source_blocks_instead_of_inventing(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);z=t/"missing.zip";write_zip(z,dataset(BASE_ARTICLE.replace("[S01]","[S99]")))
            p=run("--input",z,"--out",t/"staging")
            self.assertNotEqual(p.returncode,0)
            self.assertIn("missing source IDs",p.stderr)

    def test_existing_corruption_blocks_instead_of_claiming_success(self):
        with tempfile.TemporaryDirectory() as td:
            t=Path(td);z=t/"x.zip";write_zip(z,dataset())
            p=run("--input",z,"--out",t/"staging");self.assertEqual(p.returncode,0,p.stderr)
            target=t/"staging"/json.loads(p.stdout)["batch_id"]
            (target/"case-batch-review-only.zip").write_bytes(b"corrupt")
            p2=run("--input",z,"--out",t/"staging")
            self.assertNotEqual(p2.returncode,0)
            self.assertIn("corrupted",p2.stderr)

if __name__=="__main__": unittest.main()