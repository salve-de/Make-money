/* eslint-disable @typescript-eslint/no-unused-vars -- run() is the osascript entry point */
// Face check for scripts/media/auto-review.ts, run with the JavaScript-for-Automation runtime that ships with macOS
// (osascript -l JavaScript scripts/media/detect-faces.js <image path>...). It calls the same Vision request a Swift
// script would (VNDetectFaceRectanglesRequest); the Swift toolchain is not installed on this machine.
// Prints one JSON array: [{ path, faces } | { path, error }]. When Vision cannot open the file directly (SVG), the
// image is drawn through NSImage (which reads SVG on macOS 14+) and the bitmap is checked; only if that fails too
// (corrupt file) the row is an error.
ObjC.import('Foundation');
ObjC.import('Vision');
ObjC.import('AppKit');

function countFaces(handler) {
  const request = $.VNDetectFaceRectanglesRequest.alloc.init;
  if (!handler.performRequestsError($([request]), Ref())) return null;
  return request.results ? Number(request.results.count) : 0;
}

function viaNSImage(path) {
  const image = $.NSImage.alloc.initWithContentsOfFile(path);
  if (!image || image.isNil()) return null;
  const cg = image.CGImageForProposedRectContextHints(null, $(), $({}));
  if (!cg) return null;
  return countFaces($.VNImageRequestHandler.alloc.initWithCGImageOptions(cg, $({})));
}

function run(argv) {
  const out = [];
  for (const path of argv) {
    try {
      let faces = countFaces($.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(path), $({})));
      if (faces === null) faces = viaNSImage(path);
      out.push(faces === null ? { path: path, error: 'vision_failed' } : { path: path, faces: faces });
    } catch (error) {
      out.push({ path: path, error: String(error) });
    }
  }
  return JSON.stringify(out);
}
