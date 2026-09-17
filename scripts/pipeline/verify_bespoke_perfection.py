import json
from collections import Counter

ENTITIES_FILE = 'data/entities-index.json'

with open(ENTITIES_FILE, 'r') as f:
    entities = json.load(f)

total = len(entities)
print(f"Auditing all {total} entities for bespoke perfection...")

# 1. 重複チェック
preys = Counter(e.get('lootBlueprint', {}).get('targetPrey', '') for e in entities)
flaws = Counter(e.get('lootBlueprint', {}).get('structuralFlaw', '') for e in entities)
moats = Counter(e.get('moatDescription', '') for e in entities)
taglines = Counter(e.get('tagline', '') for e in entities)

dup_preys = {p: c for p, c in preys.items() if c > 1}
dup_flaws = {f: c for f, c in flaws.items() if c > 1}
dup_moats = {m: c for m, c in moats.items() if c > 1}
dup_taglines = {t: c for t, c in taglines.items() if c > 1}

print(f"\n--- Uniqueness Audit ---")
print(f"Unique targetPrey: {len(preys)} / {total} (Duplicates: {len(dup_preys)})")
print(f"Unique structuralFlaw: {len(flaws)} / {total} (Duplicates: {len(dup_flaws)})")
print(f"Unique moatDescription: {len(moats)} / {total} (Duplicates: {len(dup_moats)})")
print(f"Unique tagline: {len(taglines)} / {total} (Duplicates: {len(dup_taglines)})")

if dup_preys:
    print("\n[WARN] Sample duplicate preys:")
    for p, c in list(dup_preys.items())[:5]:
        print(f"  [{c} entities] {p[:60]}...")

# 2. 禁止パターンチェック
FORBIDDEN_PATTERNS = [
    '手堅く現金を回収する特化モデル',
    '特化型Webプラットフォームを展開し',
    '作業工数の増大や機会損失の苦痛',
    '大手競合が汎用機能ばかりを詰め込み',
    '専用Web基盤 × モダンAPI × セルフサーブ決済配管',
    '手堅く現金を回収',
    'を中心とする業務特化型ソリューション',
    '固有の専門特化ソリューション',
    'のターゲット顧客が直面する',
    'の堀の正体：',
    'における死角の力学：',
    'における競合ジレンマ：',
    'の超過利潤の源泉：',
    '固有スタック:',
    'の課題「',
    'を持つ利用者の支出意向',
    '提供。掲載月間売上は報告値で、利益は未確認。'
]

print(f"\n--- Forbidden Patterns Audit (17 Patterns) ---")
all_text = json.dumps(entities, ensure_ascii=False)
pattern_violations = 0
for pat in FORBIDDEN_PATTERNS:
    cnt = all_text.count(pat)
    print(f"  '{pat}': {cnt}")
    if cnt > 0:
        pattern_violations += cnt

print(f"\nTotal forbidden pattern violations: {pattern_violations}")

if len(dup_preys) == 0 and len(dup_flaws) == 0 and len(dup_moats) == 0 and pattern_violations == 0:
    print("\n>>> ALL ENTITIES ACHIEVED 100% BESPOKE PERFECTION! <<<")
else:
    print(f"\n>>> STILL HAS {len(dup_preys)} duplicate preys, {pattern_violations} pattern violations <<<")
