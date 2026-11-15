'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picker', {
  // { characters: [{ id, name, concept, self }], current: id }
  onLoad: (cb) => ipcRenderer.on('picker', (_e, data) => cb(data)),
  pick: (id) => ipcRenderer.send('picker-pick', id),
  // "More info": the character creator on this character.
  info: (id) => ipcRenderer.send('picker-info', id),
});
