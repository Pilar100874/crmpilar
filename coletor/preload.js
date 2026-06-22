const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coletor', {
  getStatus: () => ipcRenderer.invoke('collector:status'),
  start: () => ipcRenderer.invoke('collector:start'),
  stop: () => ipcRenderer.invoke('collector:stop'),
  onStatus: (cb) => ipcRenderer.on('show-status', cb),
});
