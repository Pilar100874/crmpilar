const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  startCollector, stopCollector, getStatus, saveConfig, loadConfig, pollNow,
  startPonto, stopPonto, startCameras, stopCameras, listarFiliais,
} = require('./collector');
const { checarAtualizacao, baixarEInstalar } = require('./updater');

// ─── Log forwarding ──────────────────────────────────────────────────────
// Intercepta console.* do processo principal (onde rodam cameras.js,
// controlid.js, collector.js) e:
//  1) grava num arquivo em userData/logs/coletor.log
//  2) reenvia para o renderer, para aparecer no DevTools (F12)
let logFilePath = null;
let logStream = null;
function initLogging() {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    logFilePath = path.join(dir, 'coletor.log');
    // rotação simples: se >5MB, renomeia como .1
    try {
      const st = fs.statSync(logFilePath);
      if (st.size > 5 * 1024 * 1024) {
        try { fs.renameSync(logFilePath, logFilePath + '.1'); } catch {}
      }
    } catch {}
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  } catch (e) {
    // sem log em arquivo, segue só stdout
  }

  const orig = {
    log: console.log.bind(console),
    info: console.info ? console.info.bind(console) : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
    error: console.error ? console.error.bind(console) : console.log.bind(console),
  };
  const fmt = (args) => args.map(a => {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ');
  const emit = (level, args) => {
    const line = `[${new Date().toISOString()}] [${level}] ${fmt(args)}`;
    try { orig[level](...args); } catch {}
    try { if (logStream) logStream.write(line + '\n'); } catch {}
    try {
      BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) w.webContents.send('main-log', { level, text: fmt(args) });
      });
    } catch {}
  };
  console.log = (...a) => emit('log', a);
  console.info = (...a) => emit('info', a);
  console.warn = (...a) => emit('warn', a);
  console.error = (...a) => emit('error', a);

  process.on('uncaughtException', (err) => {
    try { console.error('[uncaughtException]', err && err.stack || String(err)); } catch {}
  });
  process.on('unhandledRejection', (err) => {
    try { console.error('[unhandledRejection]', err && err.stack || String(err)); } catch {}
  });
}
initLogging();

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
  // Atalhos para abrir DevTools: F12 e Ctrl+Shift+I já são default, mas
  // registramos explicitamente para garantir mesmo com menu oculto.
  win.webContents.on('before-input-event', (event, input) => {
    const isF12 = input.key === 'F12';
    const isCtrlShiftI = input.control && input.shift && (input.key === 'I' || input.key === 'i');
    if (isF12 || isCtrlShiftI) {
      if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
      else win.webContents.openDevTools({ mode: 'detach' });
      event.preventDefault();
    }
  });
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
    { label: 'Abrir DevTools (logs)', click: () => { win.show(); try { win.webContents.openDevTools({ mode: 'detach' }); } catch {} } },
    { label: 'Abrir pasta de logs', click: () => { try { shell.openPath(path.join(app.getPath('userData'), 'logs')); } catch {} } },
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
ipcMain.handle('app:openLogsFolder', () => { try { shell.openPath(path.join(app.getPath('userData'), 'logs')); return true; } catch { return false; } });
ipcMain.handle('app:openDevTools', () => { try { if (win) { win.show(); win.webContents.openDevTools({ mode: 'detach' }); } return true; } catch { return false; } });
ipcMain.handle('collector:listarFiliais', () => listarFiliais());
ipcMain.handle('collector:setFilial', (evt, id, nome) => {
  saveConfig({ filialId: id, filialNome: nome });
  // reinicia coletores para aplicar novo filtro
  try { stopCollector(); } catch {}
  try { startCollector(); } catch {}
  return getStatus();
});

// ─── Descoberta de câmeras na rede local ──────────────────────────
const { discover, detectLocalSubnets } = require('./discover-cameras');
ipcMain.handle('discover:subnet', () => {
  try { return { subnets: detectLocalSubnets() }; }
  catch (e) { return { subnets: [], error: String(e.message || e) }; }
});
ipcMain.handle('discover:cameras', async (evt, opts) => {
  const marcas = Array.isArray(opts?.marcas) ? opts.marcas : [];
  const user = String(opts?.user || '');
  const senha = String(opts?.senha || '');
  return await discover({
    marcas, user, senha,
    onProgress: (done, total) => {
      try { evt.sender.send('discover:progress', { done, total }); } catch {}
    },
  });
});
ipcMain.handle('discover:create', async (evt, items) => {
  try {
    const cfg = loadConfig();
    console.log('[discover:create] recebido', Array.isArray(items) ? items.length : 0, 'itens; filial=', cfg.filialId);
    if (!cfg.filialId) return { ok: false, error: 'Nenhuma filial definida no coletor. Selecione a filial na tela principal antes de cadastrar câmeras.' };
    if (!Array.isArray(items) || !items.length) return { ok: false, error: 'nenhuma câmera selecionada' };
    const url = `${cfg.url}/functions/v1/cv-coletor-cameras`;
    console.log('[discover:create] POST', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({
        action: 'bulk_create_cameras',
        filial_id: cfg.filialId || null,
        cameras: items,
      }),
    });
    const text = await resp.text();
    let j = {};
    try { j = JSON.parse(text); } catch {}
    console.log('[discover:create] resp', resp.status, text.slice(0, 400));
    if (!resp.ok) return { ok: false, error: j?.error || `HTTP ${resp.status}: ${text.slice(0,200)}` };
    return { ok: true, created: j.created || items.length };
  } catch (e) {
    console.error('[discover:create] erro', e);
    return { ok: false, error: String(e.message || e) };
  }
});
// trigger build
