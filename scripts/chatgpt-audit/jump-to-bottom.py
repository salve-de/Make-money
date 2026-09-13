import ctypes
import time
import subprocess

cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]
cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.3)

# Click the down arrow (around x=1065, y=875)
x, y = 1065.0, 875.0
cg.CGWarpMouseCursorPosition(CGPoint(x, y))
time.sleep(0.1)

kCGEventLeftMouseDown = 1
kCGEventLeftMouseUp = 2
down = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, CGPoint(x, y), 0)
up = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, CGPoint(x, y), 0)
cg.CGEventPost(0, down)
cg.CFRelease(down)
time.sleep(0.05)
cg.CGEventPost(0, up)
cg.CFRelease(up)
time.sleep(0.5)

# Capture bottom
out_path = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/chatgpt_at_bottom.png'
subprocess.run(['screencapture', '-x', '-R700,33,740,875', out_path], check=True)
print("Clicked down arrow and captured to", out_path)
