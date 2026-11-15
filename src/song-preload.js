'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('song', {
  // { name, songs: [{ id, title, verse, chorus, week, at }], current: id|null, keySet, keyFromEnv, weekly, busy, status }
  onLoad: (cb) => ipcRenderer.on('song', (_e, data) => cb(data)),
  // The current song's mp3 bytes: { id, audio: Uint8Array }
  onAudio: (cb) => ipcRenderer.on('song-audio', (_e, data) => cb(data)),
  select: (id) => ipcRenderer.send('song-select', id),
  playing: (on) => ipcRenderer.send('song-playing', !!on),
  make: () => ipcRenderer.send('song-make'),
  setKey: (key) => ipcRenderer.send('song-key', key),
  setWeekly: (on) => ipcRenderer.send('song-weekly', !!on),
});
