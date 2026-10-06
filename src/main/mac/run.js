'use strict';

const { execFile } = require('child_process');

/** Run a command, resolve with stdout (rejects on error / non-zero exit / timeout). */
function run(cmd, args, timeout = 5000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.message = `${err.message}\n${stderr || ''}`.trim();
        reject(err);
      } else {
        resolve(String(stdout));
      }
    });
  });
}

module.exports = { run };
