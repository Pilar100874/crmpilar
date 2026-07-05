const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const {
  startCollector, stopCollector, getStatus, saveConfig, loadConfig, pollNow,
  startPonto, stopPonto, startCameras, stopCameras, listarFiliais,
} = require('./collector');
const { checarAtualizacao, baixarEInstalar } = require('./updater');

// ─── Single instance lock ────────────────────────────────────────────────
// Impede múltiplas instâncias simultâneas do Coletor (evita vários
// processos "ColetorPilar.exe" acumulando no Gerenciador de Tarefas).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let win;
let tray;

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();
  }
});

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Ponto Coletor');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir', click: () => win.show() },
    { type: 'separator' },
    { label: 'Status', click: () => { win.show(); win.webContents.send('show-status'); } },
    { type: 'separator' },
    { label: 'Sair (encerra o serviço)', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startCollector();
});

app.on('window-all-closed', (e) => e.preventDefault());

// ─── Shutdown limpo ──────────────────────────────────────────────────────
// Garante que ao "Sair" (tray, logoff, Alt+F4 após isQuitting) o processo
// realmente termina — para timers do poll, hub WebRTC e libera o tray.
function shutdownEverything() {
  try { stopCollector(); } catch {}
  try { if (tray) { tray.destroy(); tray = null; } } catch {}
}
app.on('before-quit', () => { app.isQuitting = true; shutdownEverything(); });
app.on('will-quit', shutdownEverything);
process.on('SIGINT', () => { app.isQuitting = true; app.quit(); });
process.on('SIGTERM', () => { app.isQuitting = true; app.quit(); });


const { ipcMain } = require('electron');
ipcMain.handle('collector:status', () => getStatus());
ipcMain.handle('collector:start', () => startCollector());
ipcMain.handle('collector:stop', () => stopCollector());
ipcMain.handle('collector:pollNow', () => pollNow());
ipcMain.handle('collector:startPonto', () => { startPonto(); return getStatus(); });
ipcMain.handle('collector:stopPonto', () => { stopPonto(); return getStatus(); });
ipcMain.handle('collector:startCameras', () => { startCameras(); return getStatus(); });
ipcMain.handle('collector:stopCameras', () => { stopCameras(); return getStatus(); });
ipcMain.handle('updater:check', () => checarAtualizacao());
ipcMain.handle('updater:install', async (evt, downloadUrl) => {
  return await baixarEInstalar(downloadUrl, (pct) => {
    try { BrowserWindow.getAllWindows().forEach(w => w.webContents.send('updater:progress', pct)); } catch {}
  });
});
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('collector:listarFiliais', () => listarFiliais());
ipcMain.handle('collector:setFilial', (evt, id, nome) => {
  saveConfig({ filialId: id, filialNome: nome });
  // reinicia coletores para aplicar novo filtro
  try { stopCollector(); } catch {}
  try { startCollector(); } catch {}
  return getStatus();
});
