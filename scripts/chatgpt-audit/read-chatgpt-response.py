import ctypes
import time
import subprocess
import os

cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')

cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]

class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

def scroll(delta, count=15):
    cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 500.0))
    time.sleep(0.05)
    for _ in range(count):
        ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, delta)
        cg.CGEventPost(0, ev)
        cg.CFRelease(ev)
        time.sleep(0.03)
    time.sleep(0.4)

subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.3)

# Scroll up significantly to reach top of this response
print("Scrolling UP...")
scroll(20, count=25)

out_dir = '/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage'
for i in range(5):
    img_path = f"{out_dir}/chatgpt_resp_p{i}.png"
    subprocess.run(['screencapture', '-x', '-R700,33,740,875', img_path], check=True)
    print(f"Captured page {i} to {img_path}")
    scroll(-15, count=10) # scroll down

