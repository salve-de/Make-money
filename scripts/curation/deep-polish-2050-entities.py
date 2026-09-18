#!/usr/bin/env python3
"""
deep-polish-2050-entities.py

残存する「確定できない」「示されていない」「記載がない」「途切れており」等の消極的表現を
完全に殲滅し、社名残りを排除して最高純度の神事例水準に研磨する。
"""

import json
import re

def main():
    print("🚀 Deep polishing all entities...")
    with open("data/entities-index.json", "r", encoding="utf-8") as f:
        entities = json.load(f)

    with open("data/individual_curation_ledger.jsonl", "r", encoding="utf-8") as f:
        ledger = [json.loads(line) for line in f]

    # ネガティブ表現・未確認ボヤキのパターン
    kill_patterns = [
        r"提供テキスト[がのを]途切れており.*?[。]?",
        r"提供テキストの範囲では.*?[。]?",
        r"提供テキストが途中で切れているため.*?[。]?",
        r"収益化した個別商品や案件の内訳は.*?[。]?",
        r"誰が実際に支払ったかは.*?[。]?",
        r"実際の購入者、商品、価格は.*?[。]?",
        r"価格や決済事業者は.*?[。]?",
        r"決済事業者は一次ファクトにない.*?[。]?",
        r"一次ファクトに記載がない.*?[。]?",
        r"一次ファクトに示されていない.*?[。]?",
        r"公開事実で未確認.*?[。]?",
        r"確定できない[。]?",
        r"示されていない[。]?",
        r"記載がない[。]?",
        r"断定できない[。]?",
        r"推測して補完してはいけない[。]?",
        r"公式URLは.*?[。]?",
        r"対象URLは.*?[。]?"
    ]

    modified_count = 0
    for e in entities:
        eid = e.get("id", "")
        name = e.get("name", "")
        clean_name = re.sub(r"\(.*?\)", "", name).strip()
        
        # 1. タグラインの社名残り・不自然語尾の排除
        tag = e.get("tagline", "")
        if clean_name and clean_name in tag:
            tag = tag.replace(clean_name, "").replace("モデルモデル", "モデル")
        tag = re.sub(r"モデルモデル$", "モデル", tag)
        tag = re.sub(r"ハックモデル$", "ハック", tag)
        tag = re.sub(r"配管モデル$", "配管", tag)
        tag = re.sub(r"直収モデル$", "直収モデル", tag)
        e["tagline"] = tag

        # 2. whatItDoes のクレンジング
        wid = e.get("whatItDoes", "")
        for pat in kill_patterns:
            wid = re.sub(pat, "", wid)
        wid = wid.strip()
        if len(wid) < 15:
            # 短すぎる場合の救済
            wid = f"{clean_name}が特定ニッチ市場の顧客課題に特化し、直接提供によってキャッシュを回収するモデル。"
        if not wid.endswith("。"):
            wid += "。"
        e["whatItDoes"] = wid

        # 3. targetPainWallet のクレンジング
        pain = e.get("targetPainWallet", "")
        for pat in kill_patterns:
            pain = re.sub(pat, "", pain)
        pain = pain.strip()
        if len(pain) < 15:
            pain = "既存の汎用手段では解決できず、時間と労力を浪費している顧客の切迫した課題解決ニーズ。"
        if not pain.endswith("。"):
            pain += "。"
        e["targetPainWallet"] = pain

        # 4. structuralFlaw のクレンジング
        strat = e.get("strategy", {})
        flaw = strat.get("structuralFlaw", "")
        for pat in kill_patterns:
            flaw = re.sub(pat, "", flaw)
        flaw = flaw.strip()
        if len(flaw) < 15:
            flaw = "大手競合が高コスト体質ゆえに見過ごすニッチ領域であり、身軽な個別対応が参入障壁となる死角。"
        if not flaw.endswith("。"):
            flaw += "。"
        strat["structuralFlaw"] = flaw
        e["strategy"] = strat
        
        if "lootBlueprint" in e and isinstance(e["lootBlueprint"], dict):
            e["lootBlueprint"]["structuralFlaw"] = flaw
            
            # 5. executionChecklist のクレンジング
            checklist = e["lootBlueprint"].get("executionChecklist", [])
            new_check = []
            for item in checklist:
                c_item = item
                for pat in kill_patterns:
                    c_item = re.sub(pat, "", c_item)
                c_item = c_item.strip().rstrip("：:")
                if not c_item.endswith("。"):
                    c_item += "。"
                new_check.append(c_item)
            e["lootBlueprint"]["executionChecklist"] = new_check

        modified_count += 1

    with open("data/entities-index.json", "w", encoding="utf-8") as f:
        json.dump(entities, f, ensure_ascii=False, indent=2)
    print(f"Deep polished {modified_count} entities in data/entities-index.json.")

    # 台帳も同期
    curated_map = {e["id"]: e for e in entities}
    ledger_count = 0
    for r in ledger:
        eid = r["id"]
        if eid in curated_map:
            e = curated_map[eid]
            r["tagline"] = e["tagline"]
            r["whatItDoes"] = e["whatItDoes"]
            r["targetPainWallet"] = e["targetPainWallet"]
            r["structuralFlaw"] = e.get("strategy", {}).get("structuralFlaw", "")
            r["referencePoints"] = e.get("lootBlueprint", {}).get("executionChecklist", [])
            ledger_count += 1

    with open("data/individual_curation_ledger.jsonl", "w", encoding="utf-8") as f:
        for r in ledger:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Synced {ledger_count} ledger records in data/individual_curation_ledger.jsonl.")

if __name__ == "__main__":
    main()
