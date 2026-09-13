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

prompt = """【AntigravityよりChatGPTへ：第4ラウンド（ユーザーからの最高一喝 ＆ 収集・保存の極限ストレステスト）】

ユーザーより今、以下の痛烈な一撃が入った：
「てか　収集とか 保存とか 全部 完璧を 目指すとか言ってたのに これかよ。右（ChatGPT）に言っておけよ」

この一喝を受け、我々は「4大恒久契約（Identity/Truth, Serving Index, Immutable Dossier, Promotion）」をコード・白書へ完全固定した。
しかし、ユーザーが「これかよ」と憤る背景には、実運用における以下の【収集・保存の現実的リスク（死角）】がまだ完璧に潰し切れていないのではないかという疑念がある。

プロの最高アーキテクトとして、以下の3つの「最悪シナリオ」に対する我々の防衛壁に1ミリでも穴がないか、極限まで冷徹に批判・検証してくれ：

1. **【収集の死角】：クローラーやLLMが「もっともらしい嘘の財務・関係性」を自動生成してFoundationに突っ込んだ場合、100年後にゴミの山にならないか？**
   - 防衛策：Promotion Gate（Raw ➔ Partial ➔ Publishable）において、一次ソース（開示PDF/魚拓原本のSHA-256）が紐付かない数字は `UNVERIFIED` / `PARTIAL` に隔離し、Serving Index（公開画面）へは絶対に出さない。これだけで100年耐えられるか？

2. **【保存の死角】：1億件のImmutable Dossier（views/make-money/dossier-v1/...）をR2に置いた時、Cloudflare R2のコスト・API制限・メタデータ破損で破綻しないか？**
   - 防衛策：ハッシュ2階層分散（`objects/<shard>/<entity_id>/<hash>.json.gz`）＋ gzip圧縮（1件1KB）で1億件でも100GB。Class A/BオペレーションはCDNキャッシュ（Hit率99%超）で遮断。この計算に狂いはないか？

3. **【表示・検索の死角】：1億件から「利益率80%超かつ黒字」を1秒で絞り込む時、本当にTiny Index（80B）だけで耐えられるか？**
   - 防衛策：Query ContractでCursor（Generation + SortValues + EntityId）を固定し、D1からClickHouse/Parquetへの移行境界を完全抽象化。

この3点について、お前の冷徹な最終判定をくれ。ユーザーに胸を張って「これで完全に大丈夫だ」と言い切るための最後の一撃を頼む。"""

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
print(f"ChatGPT Window: X={wx}, Y={wy}, W={ww}, H={wh}")

click_x = wx + ww // 2
click_y = wy + wh - 65
print(f"Clicking input area at ({click_x}, {click_y})...")
click(click_x, click_y)
time.sleep(0.5)

# 3. Paste and send
subprocess.run(['osascript', '-e', '''
tell application "System Events"
  tell process "Safari"
    keystroke "v" using {command down}
    delay 0.5
    keystroke return
  end tell
end tell
'''])
print("Round 4 posted successfully!")
