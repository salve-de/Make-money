import Quartz
import time
import subprocess

# Safari activate
subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.3)

# マウスカーソルをチャットエリアの中央に移動
# ウィンドウ位置: (705, 29)、サイズ: (735, 1021)
# チャットエリア中央: x = 705 + 360 = 1065, y = 500
point = Quartz.CGPoint(1065, 500)

# スクロールホイールイベント (下方向: units negative)
for _ in range(10):
    scroll_event = Quartz.CGEventCreateScrollWheelEvent(
        None,
        Quartz.kCGScrollEventUnitLine,
        1,
        -15 # 下スクロール
    )
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, scroll_event)
    time.sleep(0.05)

time.sleep(0.5)

# キャプチャ
output_path = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/chatgpt_scrolled_cg.png'
subprocess.run(['screencapture', '-x', '-R705,29,735,1021', output_path], check=True)
print("Scrolled with CGEvent and captured.")
