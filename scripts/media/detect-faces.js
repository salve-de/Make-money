/* eslint-disable @typescript-eslint/no-unused-vars -- run() is the osascript entry point */
// Face check for scripts/media/auto-review.ts, run with the JavaScript-for-Automation runtime that ships with macOS
// (osascript -l JavaScript scripts/media/detect-faces.js <image path>...). It calls the same Vision request a Swift
// script would (VNDetectFaceRectanglesRequest); the Swift toolchain is not installed on this machine.
// Prints one JSON array: [{ path, faces } | { path, error }]. An image Vision cannot read (SVG, corrupt) yields an error.
ObjC.import('Foundation');
ObjC.import('Vision');

function run(argv) {
  const out = [];
  for (const path of argv) {
    try {
      const request = $.VNDetectFaceRectanglesRequest.alloc.init;
      const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(path), $({}));
      const ok = handler.performRequestsError($([request]), Ref());
      if (!ok) {
        out.push({ path: path, error: 'vision_failed' });
        continue;
      }
      const results = request.results;
      out.push({ path: path, faces: results ? Number(results.count) : 0 });
    } catch (error) {
      out.push({ path: path, error: String(error) });
    }
  }
  return JSON.stringify(out);
}
