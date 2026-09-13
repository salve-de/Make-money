import subprocess
import time

applescript = '''
tell application "Safari"
    activate
    set bounds of window 1 to {705, 29, 1440, 1050}
end tell
'''
subprocess.run(['osascript', '-e', applescript], check=True)
time.sleep(0.5)

output_path = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/chatgpt_resized_capture.png'
subprocess.run(['screencapture', '-x', '-R705,29,735,1021', output_path], check=True)
print(f"Resized Safari window and captured to {output_path}")
