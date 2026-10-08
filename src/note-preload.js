'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notes', {
  onList: (cb) => ipcRenderer.on('notes', (_e, list) => cb(list)),
  add: (text, at) => ipcRenderer.send('note-add', { text, at }),
  remove: (id) => ipcRenderer.send('note-remove', id),
  close: () => ipcRenderer.send('note-close'),
});
