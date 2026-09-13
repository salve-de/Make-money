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

prompt = """【AntigravityよりChatGPTへ：第6ラウンド（ユーザーからの直球の問い：結局なにをどうやって実装するの？R2根本的に変更するの？）】

ユーザーから今、極限までストレートな一喝が入った：
「で、結局 なにをどうやって 実装するの？ R2根本的に変更するの？ 右と言い合え」

この問いに対して、お互いにプロのアーキテクトとして曖昧さを1ミリも残さず白黒つけたい。

私の見解はこうだ：

### 1. 「R2は根本的に変更するのか？」に対する結論
**【結論：根本的変更は一切不要。物理バケット構造（Raw ➔ Lake ➔ Views）は1ミリも変えない。変えるのは「保存ポリシー（TTL）」と「書き込み時のメタデータ契約」だけである。】**
- **理由**:
  - Layer 1（原本: `foundation-raw/`）：完全不変・永久保存のまま変更なし。
  - Layer 2（事実: `foundation-lake/`）：追記専用・永久保存のまま変更なし。
  - Layer 3（表示: `views/make-money/dossier-v1/objects/...`）：パス構造は維持。変更点は、Cloudflare R2の「Object Lifecycle Rule」で `views/` プレフィックスに「90日TTL（過去世代自動消却）」を1行設定するだけ。
  - これにより、R2の全面移行やデータ移行などの手戻り・大工事は物理的にゼロである。

### 2. 「で、結局なにをどうやって実装するのか？」に対する具体的タスク
実装対象は巨大な作り直しではなく、以下の「4つの外科的ピンポイント実装」だけで完了する：

1. **【収集・スキーマ層】Claim単位の `evidenceLocator` ＆ `sourceClass` 追加**:
   - `src/shared/financial-entity-schema.ts` および `src/lib/foundation/universal-lake-schema.ts` に、原本の `{ page, table, row, column, exactQuote }` と `sourceClass`（PRIMARY / INDEPENDENT_SECONDARY / etc.）の型を追加。
2. **【検索抽象層】`QueryContract` インターフェースの配備**:
   - `src/lib/storage/query-contract.ts` を新設。
   - `search(filters, sort, cursor, limit)` と `cursor: { indexGeneration, sortValues, entityId }` を定義。
   - 現行は D1 / JSON Provider を通し、将来100M時に ClickHouse Provider へアプリ側の変更ゼロで差し替え可能にする。
3. **【鮮度同期層】`sourceRevision` 突合による `INDEX_STALE` 検知**:
   - `publicSummaryEntity`（Tiny Record）と `dossier` の両方に `sourceRevision` を持たせ、画面遷移時に一致を確認。不一致なら再取得を促す。
4. **【保存設定層】R2 Lifecycle Rules（90日TTL）の適用**:
   - Cloudflare R2 のバケット設定で `views/make-money/dossier-v1/` に 90日TTL を設定。原本（Raw/Lake）は永久保持。

---

この私の結論とお前の見解を突き合わせたい。
お前から見て：
- 「R2は根本的に変更するのか？」に対する私の「変えない（TTL追加だけ）」という判断は本当に正しいか？実はR2のパスや構造に根本的変更が必要な死角が残っていないか？
- 「なにをどうやって実装するのか」の4ステップに不足や余計な過剰実装はないか？
ユーザーに1秒で伝わるよう、お前の冷徹な判定と反論をくれ！"""

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
    print("Done! Sent prompt to ChatGPT.")

if __name__ == '__main__':
    main()
