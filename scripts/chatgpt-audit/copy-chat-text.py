import subprocess
import time

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

delay 0.3

tell application "System Events"
    tell process "Safari"
        set frontmost to true
        -- 回答エリアをクリック
        click at {900, 500}
        delay 0.2
        -- 全選択
        keystroke "a" using command down
        delay 0.2
        -- コピー
        keystroke "c" using command down
        delay 0.2
    end tell
end tell
'''
subprocess.run(['osascript', '-e', applescript], check=True)

# クリップボードから読み込み
res = subprocess.run(['pbpaste'], capture_output=True, text=True)
with open('/tmp/chatgpt_copied_text.txt', 'w') as f:
    f.write(res.stdout)

print(f"Copied {len(res.stdout)} chars from Safari. Preview:")
print(res.stdout[-3000:])
