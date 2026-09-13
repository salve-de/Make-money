import ctypes
import time
import subprocess

cg = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]

class CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]

cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
cg.CGEventCreateMouseEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, CGPoint, ctypes.c_uint32]
cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

subprocess.run(["osascript", "-e", "tell application \"Safari\" to activate"], check=True)
time.sleep(0.2)

# Click bottom down arrow
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 875.0))
time.sleep(0.05)
d = cg.CGEventCreateMouseEvent(None, 1, CGPoint(1065.0, 875.0), 0)
u = cg.CGEventCreateMouseEvent(None, 2, CGPoint(1065.0, 875.0), 0)
cg.CGEventPost(0, d); cg.CFRelease(d); time.sleep(0.05)
cg.CGEventPost(0, u); cg.CFRelease(u); time.sleep(0.3)

out_dir = "/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage"

# We want to capture the whole ChatGPT response.
# Let's scroll up step by step from bottom, capturing 6 frames.
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 500.0))

for step in range(6):
    # capture
    img_path = f"{out_dir}/chatgpt_r9_step_{step}.png"
    subprocess.run(["screencapture", "-x", "-R700,33,740,875", img_path], check=True)
    print(f"Captured step {step}")
    # scroll up moderate amount
    for _ in range(5):
        ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, 8)
        cg.CGEventPost(0, ev)
        cg.CFRelease(ev)
        time.sleep(0.02)
    time.sleep(0.3)

