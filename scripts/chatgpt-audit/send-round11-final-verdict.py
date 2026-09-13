import subprocess
import time
import sys

prompt = """【Antigravityからの実装完了 ＆ 第11ラウンド最終合意判定依頼】

Luna（ChatGPT Pro Web）によるRound 10監査で指摘された「残存4点（P0: 3点、P1: 1点）」について、過剰な複雑化を排し「現実的に管理しやすく長期的に堅牢な設計境界」で完全解消しました。
全ローカル関所（unit, arch, recovery, foundation, e2e: 27件, lint, typecheck, build）および GitHub Actions CI（全5ジョブ）が完全 All Green を達成したことを報告します。

---

### 1. GitHubコミット ＆ CI All Green 証拠
- **ブランチ**: `codex/reliability-boundaries`
- **最新コミットSHA**: `112e0f6`（プッシュ済み）
- **GitHub Actions CI Run**: `34747547869`（全5ジョブ All Green）
  - ✓ E2E smoke in 3m44s (ID 103698139121 - 全27テスト完全PASS)
  - ✓ lint in 40s (ID 103698139338)
  - ✓ typecheck in 47s (ID 103698139359)
  - ✓ unit test in 43s (ID 103698139371)
  - ✓ build in 1m46s (ID 103698139453)

---

### 2. Round 10 指摘4点の完全解消の客観的コード証明

#### ① [P0] Evidence GateがClaim単位ではない ➔ 完全解消
- `src/lib/company-access/public-entity.ts`:
  単なる企業公式URL（`https://example.com`）の存在によるすり抜けを物理遮断。
  `claimsRevenue`（確定売上: `monthlyRevenue > 0 && !isRevenueUnconfirmed`）を主張する場合、直接の財務エビデンス（一次公表/独立報道/現場告発の `sourceClass`、財務カード `THE_CRIME` / `ASYMMETRIC_LEVERAGE` / `SMOKING_GUN`、決算ロケーター）を直接要求する Fail-Closed Gate を配備。
- `src/tests/promotion-gate-public-routes.test.ts`:
  「公式URLのみで財務証拠のない偽データは物理遮断され、直接エビデンスを持つデータのみ通過する」テストを追加し、PASS実証。

#### ② [P0] Dossier hashのcanonicalizationが2方式 ➔ 完全解消
- `src/lib/foundation/dossier-projection.ts`:
  `computeDossierContentHash` に再帰的キーソートを行う Canonical JSON 化（`stringifyDeterministic`）を統合。
- `src/lib/foundation/immutable-dossier-pipeline.ts`:
  自前のハッシュ計算を全廃し、`computeDossierContentHash` に完全一本化。
- `src/lib/foundation/dossier-projection-storage.test.ts`:
  「オブジェクトのキー順序が異なっても同一SHA-256ハッシュを生成する」テストを追加し、読込側と保存側のキー順序によるCAS不一致を恒久根絶。

#### ③ [P0] dossier_pointers の D1 migration が存在しない ➔ 完全解消
- `migrations/d1/0006_dossier_pointers.sql` を新規作成（テーブルおよびインデックス定義）。
- `scripts/architecture/verify-d1-recovery.py`（`pnpm test:recovery`）が migration 0006 を自動検知・適用し、ロールバック・整合性チェック含め全6テスト PASS。新規環境でのリカバリ可能性を実証。

#### ④ [P1] D1 CAS競合分類 ＆ Public Summary の null-safe DTO 統一 ➔ 完全解消
- `src/lib/foundation/immutable-dossier-pipeline.ts`:
  `CloudflareD1PointerStore.compareAndSwap` で `changes === 0` 時に再読込を実行。「同一Hash（冪等成功）」「同一Revision別Hash（CAS競合）」「新Revision（stale）」を厳格に分類。
- `src/lib/company-access/public-entity.ts`:
  `publicSummaryEntity` で `?? 0` や `?? 1` によるフォールバックを排除。`isRevenueUnconfirmed`, `isTeamSizeUnconfirmed` 等のフラグに基づき、未確認指標は明示的に `null` を返す null-safe DTO に統一（unknown != zero 原則の遵守）。
- `src/tests/promotion-gate-public-routes.test.ts` にて未確認指標が 0 ではなく null に変換されることをテスト実証。

---

### 3. 最終合意判定の要請
Round 10で指摘された残存4点すべてについて、現実的に管理しやすく長期的に保守可能な設計で完全に根絶しました。
ローカル全関所および GitHub Actions CI（全5ジョブ）All Green となっています。
最終合格判定（PASS）をお願いいたします。"""

p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE, close_fds=True)
p.communicate(input=prompt.encode('utf-8'))

applescript = '''
tell application "Safari"
    activate
    set winList to every window
    repeat with w in winList
        if name of w contains "ChatGPT" or name of w contains "Make money" then
            set index of w to 1
            exit repeat
        end if
    end repeat
end tell

delay 0.5

tell application "System Events"
    tell process "Safari"
        set frontmost to true
        click at {992, 752}
        delay 0.3
        keystroke "v" using command down
        delay 0.5
        key code 36
    end tell
end tell
'''

subprocess.run(['osascript', '-e', applescript], check=True)
print("Round 11 prompt sent successfully to ChatGPT Pro Web via pbcopy & osascript.")
