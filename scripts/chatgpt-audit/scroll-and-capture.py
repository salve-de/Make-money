import subprocess
import time

def capture(name):
    path = f'/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/{name}.png'
    subprocess.run(['screencapture', '-x', '-R705,29,575,803', path], check=True)
    return path

# Safari activate
applescript_activate = '''
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
'''
subprocess.run(['osascript', '-e', applescript_activate], check=True)
time.sleep(0.3)

# キャプチャ1 (現状)
capture('chatgpt_round8_p1')

# 少し下にスクロール (Page Down)
applescript_scroll1 = '''
tell application "System Events"
    tell process "Safari"
        set frontmost to true
        key code 125 using {shift down}
        key code 125 using {shift down}
    end tell
end tell
'''
subprocess.run(['osascript', '-e', applescript_scroll1], check=True)
time.sleep(0.5)
capture('chatgpt_round8_p2')

# さらに下にスクロール
subprocess.run(['osascript', '-e', applescript_scroll1], check=True)
time.sleep(0.5)
capture('chatgpt_round8_p3')

# さらに下にスクロール
subprocess.run(['osascript', '-e', applescript_scroll1], check=True)
time.sleep(0.5)
capture('chatgpt_round8_p4')

print("Captured 4 pages of ChatGPT Round 8 audit response.")
