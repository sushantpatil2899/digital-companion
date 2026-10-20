'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('personality', {
  // { sliders: [[path, label, help, group]], values: { path: score }, locked: [path], history: [week] }
  onLoad: (cb) => ipcRenderer.on('personality', (_e, data) => cb(data)),
  set: (path, value) => ipcRenderer.send('personality-set', path, value),
  lock: (path, locked) => ipcRenderer.send('personality-lock', path, locked),
  undoWeek: (week) => ipcRenderer.send('growth-undo', week),
  reset: () => ipcRenderer.send('personality-reset'),
  openFile: () => ipcRenderer.send('personality-open-file'),
});
