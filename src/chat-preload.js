'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chat', {
  // { messages: [{ from: 'you'|'him', text }], question: { text, answers } | null, status, canListen, listening }
  onLoad: (cb) => ipcRenderer.on('chat', (_e, data) => cb(data)),
  send: (text) => ipcRenderer.send('chat-send', text),
  // 🎤: listen once (again: stop)
  listen: () => ipcRenderer.send('chat-listen'),
});
