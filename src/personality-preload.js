'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('personality', {
  // { sliders: [[path, label, help, group]], values: { path: score } }
  onLoad: (cb) => ipcRenderer.on('personality', (_e, data) => cb(data)),
  set: (path, value) => ipcRenderer.send('personality-set', path, value),
  reset: () => ipcRenderer.send('personality-reset'),
  openFile: () => ipcRenderer.send('personality-open-file'),
});
