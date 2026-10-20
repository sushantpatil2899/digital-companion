// JavaScript for Automation (run with `osascript -l JavaScript`): lists the
// normal windows showing on any screen, front to back, with where they are, as
// JSON: {"windows":[{"id":123,"app":"zoom.us","title":"…","x":0,"y":25,"width":1280,"height":800}]}
// App names, window ids and positions come without any permission prompt.
// Window titles only come once Togepi may record the screen ("Let him read my
// screen"); otherwise macOS leaves them out and `title` is null.

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
    windows.push({
      id: Number(w.kCGWindowNumber) || null,
      app: String(w.kCGWindowOwnerName),
      title: w.kCGWindowName ? String(w.kCGWindowName) : null,
      x: Number(b.X) || 0,
      y: Number(b.Y) || 0,
      width,
      height,
    });
  }
  return JSON.stringify({ windows });
}
