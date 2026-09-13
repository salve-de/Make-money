import subprocess
import time
import ctypes
from ctypes import c_void_p, c_int, c_double, c_uint32, Structure

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

def get_safari_text():
    script = 'tell application "Safari" to return text of front document'
    res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
    return res.stdout

def send_message_to_chatgpt(prompt_text):
    # 1. クリップボードにセット
    p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
    p.communicate(prompt_text.encode('utf-8'))

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

    # 3. 入力エリアをクリック
    # テキストエリアはウィンドウ下部（約60px上）
    click_x = wx + ww // 2
    click_y = wy + wh - 65
    print(f"Clicking input area at ({click_x}, {click_y})...")
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
    print("Message sent to ChatGPT!")

if __name__ == '__main__':
    prompt = """【Antigravity（開発・実装AI）より、ChatGPT（IR・アーキテクチャ監査役）へ：100年耐久・1億事例スケールに関する批判的討議の開始】

ユーザーより「何がしたいのか明確にし、右チャット（ChatGPT）とお互いに批判的に何度も言い合って完全にしろ」との至上命題を受けました。

まず、我々が「そもそも何をしたいのか（北極星）」を極限まで明確に定義します：
「世に溢れる『努力・理念・綺麗事』という欺瞞の煙幕を完全に焼き払い、世界中の『生々しい金儲けの事実と手口（資本主義の裏帳簿）』を冷徹に白日の下に晒し続けることで、読者に『不公正なカンニングペーパー（攻略本）』を提供し、マネーの関所（交差点）として君臨すること。そのために、100年・1億事例（100M Scale）に達しても1バイトも壊れず、0.01秒で画面が表示され、不完全データや一文ゴミが一切混入しない自走データ基盤を確立すること。」

この北極星に基づき、直近で以下の「4大恒久アーキテクチャ」を実装しました：
1. 目録（Tiny Index Record: 約80B）と詳細（Heavy Dossier: 約5KB）の完全分離。一覧画面の初期HTMLには詳細を含めず、クリック時またはURL指定時のみオンデマンドLazy Loading。初期HTMLを550GBから数KBへ圧縮。
2. ゼロファットクライアント（Zero-Fat Client）：ブラウザメモリで全件配列を持たず、サーバーサイドカーソルページネーションと仮想ウィンドウで描画。
3. APIインメモリキャッシュ＆O(1) Mapルックアップによるミリ秒応答。
4. 2層ハイブリッド品質検問所（Tier 1: 秒間890万件のストリーミング全数算術監査、Tier 2: 直近差分100%＋統計的層化サンプリングによるPlaywright実機E2E走査でCI時間を2分以内に固定）。

【あなた（ChatGPT）への批判的質問・論点突きつけ】：
このアーキテクチャに対して、プロのデータエンジニア・アーキテクトとして最も冷酷・批判的な目で以下の弱点を突いてください。
① 1億件に達した際、Cloudflare D1（SQLite上限10GB）やR2のリスト課金・レートリミットをどう回避し切るのか？
② 同名企業・買収・過年度修正・デマ混入に対して、バイテンポラル（2軸時間管理）やTruth Discoveryなしで破綻しないのか？
③ 現在の「軽量サマリー＋オンデマンドフェッチ」において、キャッシュ無効化やオフライン・検索インデックスのボトルネックはどうなるのか？

一切の忖度やおためごかしを排除し、急所を容赦なくえぐり出して批判してください。"""
    
    send_message_to_chatgpt(prompt)
