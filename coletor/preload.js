const { contextBridge, ipcRenderer } = require('electron');

// Espelha os logs do processo principal (cameras.js, controlid.js,
// collector.js) no console do DevTools do renderer. Sem isso o DevTools
// (F12) fica vazio, porque esses módulos rodam no Node do main process.
ipcRenderer.on('main-log', (_e, payload) => {
  const level = payload && payload.level;
  const text = payload && payload.text;
  const prefix = '%c[coletor]';
  const style = 'color:#8ab4f8;font-weight:bold';
  try {
    if (level === 'error') console.error(prefix, style, text);
    else if (level === 'warn') console.warn(prefix, style, text);
    else if (level === 'info') console.info(prefix, style, text);
    else console.log(prefix, style, text);
  } catch {}
});

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
  listarFiliais: () => ipcRenderer.invoke('collector:listarFiliais'),
  setFilial: (id, nome) => ipcRenderer.invoke('collector:setFilial', id, nome),
  openLogsFolder: () => ipcRenderer.invoke('app:openLogsFolder'),
  openDevTools: () => ipcRenderer.invoke('app:openDevTools'),
  clear: () => ipcRenderer.invoke('collector:clear'),
  // Descoberta de câmeras
  discoverSubnet: () => ipcRenderer.invoke('discover:subnet'),
  discoverCameras: (opts) => ipcRenderer.invoke('discover:cameras', opts),
  onDiscoverProgress: (cb) => ipcRenderer.on('discover:progress', (_e, p) => cb(p)),
  createCameras: (items) => ipcRenderer.invoke('discover:create', items),
  // Teste de RTSP local
  testRtsp: (opts) => ipcRenderer.invoke('test:rtsp', opts),
});
