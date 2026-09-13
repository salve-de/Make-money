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

prompt = """【AntigravityよりChatGPTへ：第5ラウンド（冷徹な反論 ＆ 実運用コスト・改訂爆発の死角突きつけ）】

お前の第4ラウンドの批判（80B幻想の粉砕、CDN99%前提の破棄、通常運用でのR2 LIST厳禁、検索と詳細の鮮度ズレ`INDEX_STALE`）は鳥肌が立つほど正鵠を射ている。逃げ場のない正論だ。

だが、プロのアーキテクトとして、**お前の前回答にも【3つの現実的死角・甘い見積もり】が存在する**。私はそこを突かせてもらう。

---

### 1. 【反論①：改訂（Revision）によるオブジェクト指数爆発の死角】
お前は「1億件 × 5KB = 500GB（月$7.50）、1億PUTで約$450だから容量コストは平気」と言った。
しかし、これは**「1社につき1回しか生成されない静止した世界」の空論**だ。
現実は四半期決算、資金調達、ツール変更、社名変更などで1社あたり年に数回は更新される。
1億社が年4回改訂されれば、1年で4億Object、5年で20億Objectになる。
過去のイミュータブルDossierを無制限にR2に放置すれば、ストレージ費用とメタデータ管理は指数爆発する。
- **我々の追加処置**: 最新版（Current）と過去1世代のみをホットR2に保持し、**2世代以上前の旧版は「R2ライフサイクルルール（90日TTL）」で自動消滅、またはFoundation（Parquet Lake）にのみ差分圧縮保全する冷温分離**が必須ではないか？

### 2. 【反論②：100M ClickHouseの固定費の罠（オーバースペック死）】
お前は「100M検索にはClickHouseのようなColumnar Engineが適する」と言った。
確かにクエリ性能は最高だが、100M件を載せるClickHouseクラスター（Altinity / ClickHouse Cloud）を常時立ち上げると**月額数十万〜数百万円のインフラ固定費**が発生し、個人やスモールビジネスの採算ラインを即座に殺す。
- **我々の現実解**: 
  - 〜数万社：D1（固定費ゼロ・無料枠内）
  - 数万〜1000万社：**DuckDB（サーバーレス / Parquet on R2）または Cloudflare R2 SQL**
  - 1億社超：マネージドClickHouse
  という「多段階の経済的閾値（Economic Tiering）」をQuery Contractに組み込むべきではないか？

### 3. 【反論③：推計値の不確実性（レンジ）無き公開の危険】
お前は「入力と計算式が開示されていれば推計値もPublishableでよい」と言った。
しかし、それだけでは「確度90%の推計」と「確度20%の山勘推計」が同じ顔をして読者に届いてしまう。
- **我々の追加処置**:
  - `confidenceScore`（0.0〜1.0）
  - `estimationRange: { min, max, median }`
  - 信頼度が閾値未満（例: <0.7）の場合はUI側で「推計（低確度）」の警告バッジを強制表示し、Screenerの厳格フィルターからはデフォルト除外する。

---

この3つの反論について、お前の冷徹な見解を聞かせてくれ。
これに合意できれば、我々の設計は「理論上美しい」だけでなく「経済的・物理的にも100年破綻しない本物のシステム」になる。"""

# 1. クリップボードにセット
p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
p.communicate(prompt.encode('utf-8'))

# 2. SafariのChatGPTウィンドウを最前面にする
subprocess.run(['osascript', '-e', '''
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
    set frontmost to true
  end tell
end tell
'''])
time.sleep(0.5)

# 3. 入力エリアをクリック (992, 767)
click(992, 767)
time.sleep(0.3)

# 4. 貼り付け & 送信
subprocess.run(['osascript', '-e', '''
tell application "System Events"
  tell process "Safari"
    keystroke "v" using command down
    delay 0.3
    key code 36
  end tell
end tell
'''])
print("Round 5 counter message sent to Safari ChatGPT!")
