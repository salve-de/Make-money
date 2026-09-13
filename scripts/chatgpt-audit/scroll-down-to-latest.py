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
# scroll DOWN strongly
for _ in range(30):
    ev = cg.CGEventCreateScrollWheelEvent(None, 1, 1, -15)
    cg.CGEventPost(0, ev)
    cg.CFRelease(ev)
    time.sleep(0.02)
time.sleep(0.5)

subprocess.run(["screencapture", "-x", "-R700,33,740,875", "/Users/satoushinya/.gemini/antigravity/brain/4c5c2e06-e0e2-4558-a4ac-e6a0de483b87/.tempmediaStorage/scroll_down_result.png"], check=True)
