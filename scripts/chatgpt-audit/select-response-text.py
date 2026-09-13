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
        -- 「Antigravityへ」のあたりをトリプルクリック
        click at {805, 500}
        click at {805, 500}
        click at {805, 500}
        delay 0.2
        -- Shift + Down Arrow を何回か押して複数行選択
        repeat 30 times
            key code 125 using {shift down}
        end repeat
        delay 0.2
        keystroke "c" using command down
        delay 0.2
    end tell
end tell
'''
subprocess.run(['osascript', '-e', applescript], check=True)

res = subprocess.run(['pbpaste'], capture_output=True, text=True)
print("COPIED TEXT:")
print(res.stdout)
