'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('welcome', {
  // { mode: 'welcome' | 'new', sections: [{title, text}], whatsNew: [{version, title, items}],
  //   switches: [{ key, label, help, on, enabled }], userName, userPronoun,
  //   brain: { engine: 'local'|'gemini', hasKey, keyFromEnv, memGB } }
  onLoad: (cb) => ipcRenderer.on('welcome', (_e, data) => cb(data)),
  set: (key, on) => ipcRenderer.send('welcome-set', key, on),
  setEngine: (id) => ipcRenderer.send('welcome-engine', id),
  setGeminiKey: (key) => ipcRenderer.send('welcome-gemini-key', key),
  onKeySaved: (cb) => ipcRenderer.on('welcome-key-saved', (_e, ok) => cb(ok)),
  setName: (name) => ipcRenderer.send('welcome-name', name),
  setPronoun: (pronoun) => ipcRenderer.send('welcome-pronoun', pronoun),
  done: () => ipcRenderer.send('welcome-done'),
});
