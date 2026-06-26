const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coletor', {
  getStatus: () => ipcRenderer.invoke('collector:status'),
  start: () => ipcRenderer.invoke('collector:start'),
  stop: () => ipcRenderer.invoke('collector:stop'),
  saveConfig: (cfg) => ipcRenderer.invoke('collector:saveConfig', cfg),
  loadConfig: () => ipcRenderer.invoke('collector:loadConfig'),
  onStatus: (cb) => ipcRenderer.on('show-status', cb),
});
