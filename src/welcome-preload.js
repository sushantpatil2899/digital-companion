'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('welcome', {
  // { mode: 'welcome' | 'new', sections: [{title, text}], whatsNew: [{version, title, items}],
  //   switches: [{ key, label, help, on, enabled }] }
  onLoad: (cb) => ipcRenderer.on('welcome', (_e, data) => cb(data)),
  set: (key, on) => ipcRenderer.send('welcome-set', key, on),
  done: () => ipcRenderer.send('welcome-done'),
});
