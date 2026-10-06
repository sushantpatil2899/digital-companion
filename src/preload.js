'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  onFrame: (cb) => ipcRenderer.on('frame', (_e, frame) => cb(frame)),
  press: () => ipcRenderer.send('press'),
  release: () => ipcRenderer.send('release'),
  contextMenu: () => ipcRenderer.send('context-menu'),
  setTrayIcon: (dataUrl) => ipcRenderer.send('tray-icon', dataUrl),
});
