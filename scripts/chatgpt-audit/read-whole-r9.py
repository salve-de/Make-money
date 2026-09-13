import ctypes, time, subprocess

cg = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32]
cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]

class CGPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]
cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

subprocess.run(["osascript", "-e", "tell application \"Safari\" to activate"], check=True)
time.sleep(0.2)
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 500.0))

out_dir = "/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage"

# Currently at bottom: let's capture bottom as r9_page_0
subprocess.run(["screencapture", "-x", "-R700,33,740,875", f"{out_dir}/r9_page_0.png"], check=True)
print("Captured r9_page_0 (bottom)")

# Scroll UP by 1 screen (approx 12 events of delta 12)
for p in range(1, 6):
    for _ in range(12):
        ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, 10)
        cg.CGEventPost(0, ev)
        cg.CFRelease(ev)
        time.sleep(0.02)
    time.sleep(0.4)
    subprocess.run(["screencapture", "-x", "-R700,33,740,875", f"{out_dir}/r9_page_{p}.png"], check=True)
    print(f"Captured r9_page_{p}")

