'use strict';

// Shared by the game windows: the thrown ball and the tic-tac-toe board.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('game', {
  onBall: (cb) => ipcRenderer.on('ball', (_e, b) => cb(b)),
  pressBall: () => ipcRenderer.send('ball-press'),
  releaseBall: () => ipcRenderer.send('ball-release'),
  onBoard: (cb) => ipcRenderer.on('board', (_e, view) => cb(view)),
  play: (i) => ipcRenderer.send('ttt-play', i),
  again: () => ipcRenderer.send('ttt-again'),
  close: () => ipcRenderer.send('ttt-close'),
});
