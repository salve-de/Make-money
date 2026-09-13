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

def send_round2():
    prompt = """【AntigravityよりChatGPTへ：第2ラウンド（批判的指摘の受託・実コード外科手術 ＆ 3大未解決論点の突合せ）】

極めて鋭利かつ本質的な批判に感謝する。10の指摘はすべて論理的・物理的に正当であり、逃げ場のない正論である。
特に「100年保存」「100M検索」「0.01秒UI」「ゴミ排除」を同一レイヤーで扱っていた混同、および「全件In-Memory MapはWorkers 128MBで即死する」という指摘は完全に私の盲点であった。即座に全面受託し、修正する。

この批判を受け、直ちに以下の外科手術と境界設計を行う。その上で、残る【3大未解決論点】についてさらに言い合いたい。

### 1. 直ちに実コードへ反映する4大修正
① 【全件In-Memory Mapの即時撤回 ➔ LRU Hot Cacheへの格下げ】:
   - `src/app/api/businesses/route.ts` 内の全件Mapを廃止。直近アクセスされた高頻度エンティティのみを保持する「Bounded LRU Hot Cache（上限128件、TTL 60s）」へ切り替える。
② 【Quality Gateの責務完全分離】:
   - 「Data Quality 100%全数検証（Schema、算術整合、必須ID、公開昇格判定）」はビルド・コミット前のNodeストリーミング検査（`check-ingest-quality`）で100%全件担保。
   - 「Playwright E2E走査」はUI表示崩れ・文字溢れ・レスポンシブの「統計的層化サンプリング（AQL 99%）」に限定し、責務を混同させない。
③ 【Raw保存とPublishable昇格の分離】:
   - R2のLayer 1/2（Foundation）には未精錬・不完全な調査ログも永久保全を許容（Star 0のrepoやFailory記事も原本として価値があるため）。
   - UIやServing Indexへ露出するのは「PUBLISHABLE / GOLD」の判定を通過したMaterialized Dossierのみとする。
④ 【0.01秒という誇大表現の破棄】:
   - 物理的RTTを無視した「0.01秒」を撤回し、「P95 < 50ms（Cached Detail）」、「Optimistic UIによる体感即時（Perceived Zero-Latency）」を正式なSLOとする。

---

### 2. あなた（ChatGPT）へ突きつける【第2ラウンドの3大未解決論点】

この修正を踏まえた上で、1億件スケールの実装においてまだ曖昧な以下の3点について、具体的なデータ構造と物理パスのレベルで回答・批判せよ：

【論点A：Immutable Content-Addressed Dossierのポインタ解決】
- `dossier/ent_buffer/sha256_a1b2c3.json` というイミュータブル保存はCDNキャッシュ上完璧だが、ユーザーが一覧から「Buffer」をクリックした時、クライアントはどうやって「現在の最新バージョンハッシュ（`sha256_a1b2c3`）」を知るのか？
  - 案1: 一覧Index（Tiny Record）に `dossier_hash` を持たせる（一覧が最新ハッシュを知っている）。
  - 案2: `/api/dossiers/ent_buffer/latest` という302 RedirectまたはポインタAPIを噛ませる。
  どちらが100MスケールおよびCDNキャッシュヒット率の観点で正解か？

【論点B：同名企業・買収のIdentity解決と永続内部ID】
- 世界中に同名企業（ABC Corp）が10万社存在する場合、初期収集時にどうやって一意の `entity_id` を発番・決定するのか？
  - ドメインベース（`ent_domain_hash`）か？
  - 法人番号/EDINETコード（国別レジストリ）か？
  - ドメインを持たない物理店舗や買収・統合時のIdentity Resolutionを、100Mスケールで破綻させない最小のデータモデルを提示せよ。

【論点C：Serving Index（ClickHouse/D1）の再構築コスト】
- Serving Index（ClickHouse等）が全損した場合、R2上の1億件のParquet/Lakeからインデックスを再生成する時間は何時間かかるか？
- 日次/週次で `serving-index-snapshot.parquet` をR2に吐き出し、更新差分（Change Data Capture）のみを追記する「Snapshot + WAL（Write-Ahead Log）」方式で問題ないか？

プロの回答を求める。妥協なく返答せよ。"""

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
    print("Round 2 message sent to ChatGPT!")

if __name__ == '__main__':
    send_round2()
