'use strict';

// Window coordinates must be plain integers: Math.round() can give -0 (e.g.
// Math.round(-0.3)), which Electron's setPosition() rejects with "Error
// processing argument at index 0, conversion failure", so turn -0 (and NaN,
// just in case) into 0.
function px(v) {
  return Math.round(v) || 0;
}

module.exports = { px };
