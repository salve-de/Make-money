import ctypes
import time
import subprocess

cg = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]
cg.CFRelease.argtypes = [ctypes.c_void_p]
cg.CGWarpMouseCursorPosition.argtypes = [CGPoint]

subprocess.run(['osascript', '-e', 'tell application "Safari" to activate'], check=True)
time.sleep(0.3)

# First jump to bottom
cg.CGWarpMouseCursorPosition(CGPoint(1065.0, 875.0))
time.sleep(0.1)
kCGEventLeftMouseDown = 1
kCGEventLeftMouseUp = 2
d = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, CGPoint(1065.0, 875.0), 0)
u = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, CGPoint(1065.0, 875.0), 0)
cg.CGEventPost(0, d); cg.CFRelease(d); time.sleep(0.05)
cg.CGEventPost(0, u); cg.CFRelease(u); time.sleep(0.5)

# Click copy button at (780, 715)
# In chatgpt_at_bottom.png, let's verify exact coordinates:
# The copy button is at approximately x=780, y=715 (window x=80, y=682 relative to window origin 700, 33)
x, y = 778.0, 715.0
cg.CGWarpMouseCursorPosition(CGPoint(x, y))
time.sleep(0.1)
d = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, CGPoint(x, y), 0)
u = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, CGPoint(x, y), 0)
cg.CGEventPost(0, d); cg.CFRelease(d); time.sleep(0.05)
cg.CGEventPost(0, u); cg.CFRelease(u); time.sleep(0.5)

