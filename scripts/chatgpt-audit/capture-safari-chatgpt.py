import subprocess
import time

# SafariのChatGPTウィンドウを最前面にしてキャプチャ撮影
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
'''
subprocess.run(['osascript', '-e', applescript], check=True)
time.sleep(0.5)

output_path = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/chatgpt_round8_response.png'
subprocess.run(['screencapture', '-x', '-R705,29,575,803', output_path], check=True)
print(f"Captured Safari ChatGPT window to {output_path}")
