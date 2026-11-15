'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  onFrame: (cb) => ipcRenderer.on('frame', (_e, frame) => cb(frame)),
  press: () => ipcRenderer.send('press'),
  release: () => ipcRenderer.send('release'),
  contextMenu: () => ipcRenderer.send('context-menu'),
  // The size of the bubble over his head ({ halfWidth, top } px, or null).
  bubble: (box) => ipcRenderer.send('bubble', box),
  setTrayIcon: (dataUrl) => ipcRenderer.send('tray-icon', dataUrl),
  setBattery: (b) => ipcRenderer.send('battery', b),
  // His chirps: { band, syllables, clip } (clip: your own sound file's bytes, or null).
  onVoice: (cb) => ipcRenderer.on('voice', (_e, v) => cb(v)),
});
