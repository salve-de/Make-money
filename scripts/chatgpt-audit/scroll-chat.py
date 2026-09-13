import subprocess
import time

# AppleScriptでマウスホイールを下にスクロール
applescript = '''
tell application "Safari" to activate
delay 0.2
tell application "System Events"
    tell process "Safari"
        set frontmost to true
        -- チャットエリアをクリックしてフォーカス
        click at {992, 500}
        delay 0.2
        repeat 15 times
            key code 125 -- down arrow
        end repeat
    end tell
end tell
'''
subprocess.run(['osascript', '-e', applescript], check=True)
