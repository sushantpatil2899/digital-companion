// The picture of an item a character holds (holdItem / playItem), shared by
// renderer.js and the animation playground (dev/playground.js).
// An item is its URL (a data: URL works too) or { src, w, h }, with w and h in
// screen px (default: the picture's own size). PNG or SVG: an SVG can also be
// given as its markup (`<svg ...>...</svg>`), and one without a size of its
// own (only a viewBox) is drawn at w × h, or SIZE on its longest side.
(function () {
'use strict';

const SIZE = 48;
const images = new Map();

/** A src for an <img>: SVG markup becomes a data: URL, anything else is a URL already. */
function srcOf(src) {
  const s = String(src).trim();
  return /^(<\?xml|<svg)/i.test(s) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}` : s;
}

/**
 * Whether a picture has a size of its own: a PNG does; an SVG only with width
 * and height on its root (with just a viewBox the browser makes one up, from
 * 300 × 150). An SVG file by URL can't be read here, so it counts as without.
 */
function ownSize(src) {
  let svg = null;
  const data = src.match(/^data:image\/svg\+xml(;base64)?(?:;[^,]*)?,(.*)$/is);
  if (data) {
    try {
      svg = data[1] ? atob(data[2]) : decodeURIComponent(data[2]);
    } catch {
      return false;
    }
  } else if (/\.svgz?(\?|#|$)/i.test(src)) return false;
  if (svg == null) return true;
  const root = (svg.match(/<svg\b[^>]*>/i) || [''])[0];
  return /\swidth\s*=\s*["']?\d/i.test(root) && /\sheight\s*=\s*["']?\d/i.test(root);
}

/** The size to draw a picture at: what was asked, else its own, else SIZE on its longest side. */
function sizeOf(img, src, spec) {
  const { w, h } = spec;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const aspect = nw && nh ? nw / nh : 1;
  if (w && h) return { w, h };
  if (w) return { w, h: w / aspect };
  if (h) return { w: h * aspect, h };
  if (nw && nh && ownSize(src)) return { w: nw, h: nh };
  return aspect >= 1 ? { w: SIZE, h: SIZE / aspect } : { w: SIZE * aspect, h: SIZE };
}

/** { img, w, h } (screen px) for an item, or null while its picture loads or when it's broken. */
function load(item) {
  if (!item) return null;
  const spec = typeof item === 'string' ? { src: item } : item;
  if (!spec.src) return null;
  const src = srcOf(spec.src);
  let img = images.get(src);
  if (!img) {
    if (images.size > 16) images.clear();
    img = new Image();
    img.onerror = () => (img.broken = true);
    img.src = src;
    images.set(src, img);
  }
  if (!img.complete || img.broken) return null;
  return { img, ...sizeOf(img, src, spec) };
}

window.Items = { load, srcOf };
})();
