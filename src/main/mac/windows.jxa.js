// JavaScript for Automation (run with `osascript -l JavaScript`): lists the
// apps that have a normal window showing on any screen, with where it is, as
// JSON: {"windows":[{"app":"zoom.us","x":0,"y":25,"width":1280,"height":800}]}
// Only owner (app) names and positions are read; macOS gives these without
// any permission prompt. Window titles (which would need Screen Recording
// permission) are not read.

ObjC.import('CoreGraphics');
ObjC.import('Foundation');

function run() {
  // kCGWindowListOptionOnScreenOnly (1) | kCGWindowListExcludeDesktopElements (16)
  const ref = $.CGWindowListCopyWindowInfo(1 | 16, 0);
  const list = ObjC.deepUnwrap(ObjC.castRefToObject(ref)) || [];
  const windows = [];
  for (const w of list) {
    if (!w || Number(w.kCGWindowLayer) !== 0) continue; // normal windows only (no menu bar, dock, …)
    if (w.kCGWindowAlpha !== undefined && Number(w.kCGWindowAlpha) === 0) continue;
    const b = w.kCGWindowBounds || {};
    const width = Number(b.Width) || 0;
    const height = Number(b.Height) || 0;
    if (!w.kCGWindowOwnerName || width < 120 || height < 90) continue; // skip tiny helper windows
    windows.push({ app: String(w.kCGWindowOwnerName), x: Number(b.X) || 0, y: Number(b.Y) || 0, width, height });
  }
  return JSON.stringify({ windows });
}
