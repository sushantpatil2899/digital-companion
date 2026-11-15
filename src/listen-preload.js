'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('listen', {
  onStart: (cb) => ipcRenderer.on('listen-start', () => cb()),
  onStop: (cb) => ipcRenderer.on('listen-stop', (_e, keep) => cb(keep)),
  // 'listening' (the mic is open), 'talking' (it hears you)
  state: (s) => ipcRenderer.send('listen-state', s),
  // { wav: Uint8Array, seconds } | { nothing: true } | { error }
  result: (r) => ipcRenderer.send('listen-result', r),
});
