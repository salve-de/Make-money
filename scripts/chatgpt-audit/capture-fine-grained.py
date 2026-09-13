import ctypes
import time
import subprocess

cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]

class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

def scroll(delta, count=3):
    cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 500.0))
    time.sleep(0.02)
    for _ in range(count):
        ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, delta)
        cg.CGEventPost(0, ev)
        cg.CFRelease(ev)
        time.sleep(0.01)
    time.sleep(0.2)

subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.2)

# First jump to bottom
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 875.0))
time.sleep(0.05)
kCGEventLeftMouseDown = 1
kCGEventLeftMouseUp = 2
d = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, CGPoint(1065.0, 875.0), 0)
u = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, CGPoint(1065.0, 875.0), 0)
cg.CGEventPost(0, d); cg.CFRelease(d); time.sleep(0.05)
cg.CGEventPost(0, u); cg.CFRelease(u); time.sleep(0.4)

out_dir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage'

# Scroll UP finely and capture 8 frames
for i in range(1, 10):
    scroll(8, count=3)
    img_path = f"{out_dir}/chatgpt_fine_up_{i}.png"
    subprocess.run(['screencapture', '-x', '-R700,33,740,875', img_path], check=True)
    print(f"Captured fine_up_{i}")

