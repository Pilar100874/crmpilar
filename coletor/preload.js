const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coletor', {
  getStatus: () => ipcRenderer.invoke('collector:status'),
  start: () => ipcRenderer.invoke('collector:start'),
  stop: () => ipcRenderer.invoke('collector:stop'),
  pollNow: () => ipcRenderer.invoke('collector:pollNow'),
  startPonto: () => ipcRenderer.invoke('collector:startPonto'),
  stopPonto: () => ipcRenderer.invoke('collector:stopPonto'),
  startCameras: () => ipcRenderer.invoke('collector:startCameras'),
  stopCameras: () => ipcRenderer.invoke('collector:stopCameras'),
  onStatus: (cb) => ipcRenderer.on('show-status', cb),
  appVersion: () => ipcRenderer.invoke('app:version'),
  checarAtualizacao: () => ipcRenderer.invoke('updater:check'),
  instalarAtualizacao: (url) => ipcRenderer.invoke('updater:install', url),
  onUpdateProgress: (cb) => ipcRenderer.on('updater:progress', (_e, pct) => cb(pct)),
});
