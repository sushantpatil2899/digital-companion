'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chat', {
  // { messages: [{ from: 'you'|'him', text }], question: { text, answers } | null, status }
  onLoad: (cb) => ipcRenderer.on('chat', (_e, data) => cb(data)),
  send: (text) => ipcRenderer.send('chat-send', text),
});
