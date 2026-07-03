const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pilar', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  snapshot: (id) => ipcRenderer.invoke('snapshot', id),
  onConfigUpdated: (cb) => ipcRenderer.on('config-updated', (_, c) => cb(c)),
  onPreviewFrame: (cb) => ipcRenderer.on('preview-frame', (_, p) => cb(p))
});
