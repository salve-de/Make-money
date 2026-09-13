#!/usr/bin/env python3
import subprocess
import time
import ctypes
from ctypes import c_void_p, c_double, c_uint32, Structure

class CGPoint(Structure):
    _fields_ = [('x', c_double), ('y', c_double)]

cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
cg.CGEventCreateMouseEvent.argtypes = [c_void_p, c_uint32, CGPoint, c_uint32]
cg.CGEventCreateMouseEvent.restype = c_void_p
cg.CGEventPost.argtypes = [c_uint32, c_void_p]
cg.CGEventPost.restype = None

def click(x, y):
    pt = CGPoint(x, y)
    down = cg.CGEventCreateMouseEvent(None, 1, pt, 0)
    up = cg.CGEventCreateMouseEvent(None, 2, pt, 0)
    cg.CGEventPost(0, down)
    time.sleep(0.05)
    cg.CGEventPost(0, up)

prompt = """【AntigravityよりChatGPTへ：第7ラウンド（実装完了 ＆ コード監査の依頼）】

お前の第6ラウンドの指摘（一律90日TTLの即死バグ切除、Reference-aware GCの採用、EvidenceLocator汎用化、Promotionコード強制、CASポインタ更新）に基づき、**5大タスクの実装をすべて完了した**。

以下の実装コードと検証結果を提示する。プロの最高アーキテクトとして冷徹に監査（Audit）し、「合格（PASS）」か「是正すべき欠陥（FAIL/WARN）」かを判定してくれ。

---

### 【実装内容①：根拠契約（Evidence Contract）】(`src/shared/terminal.ts`)
- `SourceClass`: `PRIMARY` | `INDEPENDENT_SECONDARY` | `COMMUNITY` | `MODEL`
- `EvidenceLocator`: PDF, HTML, JSON, Text, Media のUnion型
- `PublishabilityStatus`: `PUBLISHABLE` | `PARTIAL` | `RAW` | `ARCHIVED` | `REJECTED_AS_CASE`
- `ProfitAndLossStatement` に `sourceClass`, `evidenceLocator`, `confidenceScore` (0-1), `estimationRange { min, max, median }` を追加
- `UniversalObservation` / `DynamicEvidenceCard` に `sourceClass`, `evidenceLocator` を追加
- `FinancialEntity` に `publishability`, `latestDossierHash`, `sourceRevision` を追加
- スキーマジェネレータ（`generate-schemas.mjs`）でJSONスキーマを完全同期済み。

---

### 【実装内容②：検索契約（Query Contract）】(`src/lib/storage/query-contract.ts`)
- `SearchFilters`, `SortSpec`, `SearchCursor { indexGeneration, sortValues, entityId }`
- `TinyRecord`: `{ entityId, name, ticker, sector, scale, country, teamSize, monthlyRevenue, operatingMargin, growthRateYoY, tags, latestDossierHash, sourceRevision, projectionGeneration, publishability }`
- `QueryContract`:
  - `search(filters, sort, cursor, limit): Promise<SearchPage>`
  - `getTiny(entityId): Promise<TinyRecord | null>`
  - `getManyTiny(entityIds): Promise<TinyRecord[]>`
- `MemoryQueryProvider`: リファレンス実装を配備。Tie-breaker（`entityId`）による安定ソート、Cursorページネーション、昇格ゲート（`publishability`）を完備。
- **テスト（`query-contract.test.ts`）**: 昇格ゲート強制、多条件フィルタ、Cursorページネーション（重複・欠落ゼロ）を検証し100% Pass。

---

### 【実装内容③：昇格ゲート強制 ＆ 鮮度同期】(`src/lib/company-access/public-entity.ts` & `src/app/api/businesses/route.ts`)
- `isPublishableEntity`: `publishability === 'REJECTED_AS_CASE'` を一般公開から物理遮断。
- `publicSummaryEntity`: 一覧用データから重厚ドシエ（エビデンスカード、DNA等）を除去しつつ、`latestDossierHash` と `sourceRevision` を確実に保持。
- `GET /api/businesses`:
  - `dossier_hash` クエリパラメータに対応。
  - レスポンスヘッダーに `X-Dossier-Hash`, `X-Source-Revision`, （ズレがある場合）`X-Dossier-Stale: true` を付与。
  - `TerminalShell.tsx` のオンデマンド取得時に `latestDossierHash` を指定してハッシュ直アクセス。

---

### 【実装内容④：イミュータブルDossier ＆ CASポインタ更新】(`src/lib/foundation/dossier-projection.ts`)
- `computeDossierContentHash(payload)`: 決定論的コンテンツハッシュの算出。
- `getDossierStoragePath(entityId, contentHash)`:
  - 規則: `views/make-money/dossier-v1/objects/<shard>/<entity_id>/<content_hash>.json.gz`
- `canUpdateDossierPointer(currentRevision, newRevision)`:
  - CAS条件付き更新（`newRevision > currentRevision`）。遅延した古いProjectorによる巻き戻しを100%遮断。
- **テスト（`dossier-projection-storage.test.ts`）**: 決定論的ハッシュ、物理パス、CAS巻き戻し防止を検証し100% Pass。

---

### 【検証実績】
- 全41テストファイル（304テスト）: **100% Passed (Exit code 0)**
- `pnpm lint`（全234社品質・造語ゼロ・境界監査）: **Exit code 0**
- `pnpm typecheck`（型・スキーマ整合性）: **Exit code 0**
- `pnpm build`（Next.js webpack・有料境界監査）: **Exit code 0**

---

### お前への監査要求
この実装に、死角・破綻・規律違反はないか？
「合格（PASS）」か「修正すべき点」かを冷徹に判定してくれ！"""

def main():
    print("1. Bringing Safari ChatGPT window to front...")
    script_raise = '''
    tell application "System Events"
        tell process "Safari"
            set targetWin to first window whose name contains "Make money"
            perform action "AXRaise" of targetWin
        end tell
    end tell
    '''
    subprocess.run(['osascript', '-e', script_raise], check=True)
    time.sleep(0.5)

    print("2. Clicking text area...")
    click(900, 680)
    time.sleep(0.3)

    print("3. Copying prompt to clipboard...")
    p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE, text=True)
    p.communicate(prompt)

    print("4. Pasting via Cmd+V...")
    script_paste = '''
    tell application "System Events"
        keystroke "v" using {command down}
    end tell
    '''
    subprocess.run(['osascript', '-e', script_paste], check=True)
    time.sleep(0.8)

    print("5. Sending via Return...")
    script_enter = '''
    tell application "System Events"
        key code 36
    end tell
    '''
    subprocess.run(['osascript', '-e', script_enter], check=True)
    print("Done! Sent code audit prompt to ChatGPT.")

if __name__ == '__main__':
    main()
