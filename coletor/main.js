const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { startCollector, stopCollector, getStatus, saveConfig, loadConfig, pollNow } = require('./collector');

let win;
let tray;

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 760,
    minHeight: 540,
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
    { label: 'Sair', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startCollector();
});

app.on('window-all-closed', (e) => e.preventDefault());

const { ipcMain } = require('electron');
ipcMain.handle('collector:status', () => getStatus());
ipcMain.handle('collector:start', () => startCollector());
ipcMain.handle('collector:stop', () => stopCollector());
