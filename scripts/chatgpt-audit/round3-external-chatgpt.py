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

def send_round3():
    prompt = """【AntigravityよりChatGPTへ：第3ラウンド（外部メガサービス（Bloomberg, PitchBook, Crunchbase, ZoomInfo）の実戦アーキテクチャ調査結果の突きつけ ＆ 恒久契約の最終確定）】

ユーザーより「外部を徹底調査して、他の巨大サイトやサービスがどうやっているのか調べて右（ChatGPT）と議論しろ」との厳命を受け、PitchBook、Crunchbase、ZoomInfo、Bloomberg Terminalの1億〜数億レコード規模の実戦アーキテクチャを調査・解剖した。

その結果、あなたが前回答で指摘した【Identity → Time → Provenance → Truth → Projection → Search → Speed】という優先順位の正しさが、メガテックの設計事実によって完全に証明された。

---

### 1. 外部メガサービスの1億件耐久アーキテクチャ（調査事実ログ）

1. **Bloomberg Terminal（BBGID ＆ 2軸財務）**:
   - **ティッカー再利用の罠**: 社名やティッカーは時代で変わるため、12桁の不変英数字「BBGID（Bloomberg Global Identifier）」を全主体に発行し、名前ではなく不変IDで一生追跡。
   - **As-Reported vs Restated**: 財務開示は「当時の発表（As-Reported）」と「後日の訂正（Restated）」を絶対に上書きせず、バイテンポラルに2系列で永久保持。
2. **Crunchbase / PitchBook（3層パイプライン ＆ 検索分離）**:
   - **Layer 1（Raw Lake）**: S3/GCSへのイミュータブル原本保存（削除ゼロ）。
   - **Layer 2（Entity Graph & Truth Resolution）**: 買収（M&A）、社名変更、子会社関係をグラフリレーション（`A acquired_by B`）で表現。過去のファクトを書き換えない。
   - **Layer 3（Serving Index）**: Elasticsearch / ClickHouse を検索・一覧専用に配置。ブラウザにはID＋数項目の「Tiny Projection」のみを返し、詳細（Heavy Dossier）はDynamoDB/S3からCDN経由で遅延読込。
3. **ZoomInfo（品質階層の隔離）**:
   - 「Raw（未確認）」「Unverified」「Publishable（公開）」「Archived」のステータスで隔離し、未精錬データを決して抹消せず、かつ本番検索には公開基準を満たしたものだけを投影。

---

### 2. Make-Moneyにおける【3大恒久契約】の最終合意案

この外部事実を踏まえ、我々のCloudflare（R2 + D1 + Workers/Next.js）環境において、以下の3つの契約をコード・白書へ完全固定したい。あなたの批判的レビューと最終合意を求める。

#### 【契約A：Identity ＆ バイテンポラルTruth契約】
- **永続内部ID**: `ent_<hash>`（国コード/登録番号または一次取得URLドメインのUUIDv5ハッシュ）で固定。社名変更（Twitter ➔ X）でも `ent_xxx` は不変。
- **リレーション**: `relationships: [{ type: 'ACQUIRED_BY' | 'SAME_AS' | 'SUBSIDIARY_OF', targetEntityId, occurredAt }]` で過去Factを上書きせず解決。
- **2軸時間管理**: 各Factに `validTime`（事実の対象期間）と `recordedAt`（観測日時）、`verificationStatus`（VERIFIED / REPORTED / ESTIMATED / POST_MORTEM）を必須化。
- **Current Resolution**: 最新の確定値は削除・上書きではなく「投影（Derived View）」として生成。

#### 【契約B：Serving Index境界とR2スナップショット契約】
- 現在（〜1万社）: D1 / ローカルSQLiteを `ServingIndexProvider` で抽象化。
- 将来（100M社）: ClickHouse / Columnar Engine へ透過的に差し替え。
- **復元性保証**: Serving Indexが全損しても、R2上の `serving-index-snapshot.parquet` ＋ 日次Delta Journalから100%全自動再生成可能とする。

#### 【契約C：イミュータブル詳細ドシエとCDNポインタ契約】
- R2上の詳細ドシエは `datasets/dossiers/<entity_id>/<version_hash>.json`（完全不変、`Cache-Control: public, max-age=31536000, immutable`）。
- 一覧IndexのTiny Recordが `latestDossierHash` を保持し、詳細取得は直接そのハッシュURLを叩くため、CDNキャッシュパージは永久にゼロ。

---

この3大契約について、プロのアーキテクトとして「まだここに抜け穴がある」「ここが運用で死ぬ」という致命的死角があれば最後の一撃をくれ。なければ合意とみなして実装・白書へ固定する。"""

    # 1. クリップボードにセット
    p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
    p.communicate(prompt.encode('utf-8'))

    # 2. SafariのChatGPTウィンドウを最前面にする
    ascript = '''
    tell application "Safari"
      activate
      repeat with w in windows
        if name of w contains "Make money" or (URL of current tab of w) contains "chatgpt.com" then
          set index of w to 1
          exit repeat
        end if
      end repeat
    end tell
    tell application "System Events"
      tell process "Safari"
        set w to front window
        set p to position of w
        set s to size of w
        return (item 1 of p as string) & "," & (item 2 of p as string) & "," & (item 1 of s as string) & "," & (item 2 of s as string)
      end tell
    end tell
    '''
    res = subprocess.run(['osascript', '-e', ascript], capture_output=True, text=True)
    coords = res.stdout.strip().split(',')
    wx, wy, ww, wh = [int(float(c)) for c in coords]

    # 3. 入力エリアをクリック
    click_x = wx + ww // 2
    click_y = wy + wh - 65
    click(click_x, click_y)
    time.sleep(0.3)

    # 4. 貼り付け & 送信
    paste_script = '''
    tell application "System Events"
      tell process "Safari"
        keystroke "v" using command down
        delay 0.3
        key code 36
      end tell
    end tell
    '''
    subprocess.run(['osascript', '-e', paste_script])
    print("Round 3 message sent to ChatGPT!")

if __name__ == '__main__':
    send_round3()
