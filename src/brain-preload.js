'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('brain', {
  onUpdate: (cb) => ipcRenderer.on('brain', (_e, snapshot) => cb(snapshot)),
});
