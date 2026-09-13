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
    # kCGEventLeftMouseDown = 1, kCGEventLeftMouseUp = 2, kCGHIDEventTap = 0
    down = cg.CGEventCreateMouseEvent(None, 1, pt, 0)
    up = cg.CGEventCreateMouseEvent(None, 2, pt, 0)
    cg.CGEventPost(0, down)
    time.sleep(0.05)
    cg.CGEventPost(0, up)

# SafariのChatGPTウィンドウを最前面にする
ascript = '''
tell application "Safari"
  activate
  repeat with w in windows
    if URL of current tab of w contains "chatgpt.com" then
      set index of w to 1
      return {position of w, size of w}
    end if
  end repeat
  return "NOT_FOUND"
end tell
'''
res = subprocess.run(['osascript', '-e', ascript], capture_output=True, text=True)
print("Safari target window:", res.stdout.strip())
