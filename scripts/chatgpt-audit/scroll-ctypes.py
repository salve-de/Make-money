import ctypes
import time
import subprocess

# Load CoreGraphics
cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')

# CGEventCreateScrollWheelEvent(CGEventSourceRef source, CGScrollEventUnit units, uint32_t wheelCount, int32_t wheel1, ...)
cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]

# Safari activate
subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.3)

# マウスをチャット画面中央へ移動
# CGEventCreateMouseEvent
cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 500.0))
time.sleep(0.1)

# kCGScrollEventUnitLine = 1, kCGHIDEventTap = 0
for _ in range(15):
    ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, -10)
    cg.CGEventPost(0, ev)
    cg.CFRelease(ev)
    time.sleep(0.05)

time.sleep(0.5)

output_path = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/chatgpt_scrolled_ctypes.png'
subprocess.run(['screencapture', '-x', '-R705,29,735,1021', output_path], check=True)
print("Scrolled with ctypes CoreGraphics and captured to", output_path)
