'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memories', {
  // { notes, facts: [{id, text, date}], opinions: [...], journal: [{id, day, lines}] }
  onLoad: (cb) => ipcRenderer.on('memories', (_e, data) => cb(data)),
  forget: (id) => ipcRenderer.send('memory-forget', id),
  openFolder: () => ipcRenderer.send('memory-open-folder'),
  editNotes: () => ipcRenderer.send('memory-edit-notes'),
});
