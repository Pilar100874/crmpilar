const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  startCollector, stopCollector, getStatus, saveConfig, loadConfig, pollNow,
  startPonto, stopPonto, startCameras, stopCameras, listarFiliais, clearDiagnostics,
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

function clearLogFiles() {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const current = logFilePath || path.join(dir, 'coletor.log');

    try { if (logStream) logStream.end(); } catch {}
    logStream = null;

    for (const file of [current, current + '.1']) {
      try { fs.writeFileSync(file, ''); } catch {}
    }

    logFilePath = current;
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    console.log('[coletor] logs e avisos limpos pelo usuário');
    return { ok: true };
  } catch (e) {
    console.error('[coletor] falha ao limpar logs:', e.message);
    return { ok: false, error: String(e.message || e) };
  }
}

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
ipcMain.handle('collector:clear', () => {
  try { clearDiagnostics(); } catch {}
  return clearLogFiles();
});
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
    // Dispara verificação/snapshot imediato pras câmeras recém criadas
    try {
      const { verificarCameras } = require('./cameras');
      verificarCameras(cfg).then((rs) => {
        console.log('[discover:create] snapshot inicial:', rs.length, 'câmera(s)');
      }).catch((e) => console.error('[discover:create] snapshot inicial falhou', e.message));
    } catch (e) {
      console.error('[discover:create] verificarCameras indisponível', e.message);
    }
    return { ok: true, created: j.created || items.length, ids: j.ids || [] };
  } catch (e) {
    console.error('[discover:create] erro', e);
    return { ok: false, error: String(e.message || e) };
  }
});

// ─── Teste de RTSP local (usa ffmpeg-static) ────────────────────
// Reproduz o mesmo que o coletor faz internamente para o "ao vivo":
// tenta abrir o stream por 1s e reporta codec/resolução ou o erro exato
// (401, 404, timeout, refused, HEVC não suportado etc).
const { spawn } = require('child_process');
let _ffmpegPath = null;
try { _ffmpegPath = require('ffmpeg-static'); } catch { _ffmpegPath = null; }
ipcMain.handle('test:rtsp', async (_evt, opts) => {
  const url = String(opts?.url || '').trim();
  const transport = opts?.transport === 'udp' ? 'udp' : 'tcp';
  if (!url || !/^rtsp:\/\//i.test(url)) {
    return { ok: false, error: 'URL RTSP inválida (deve começar com rtsp://)', log: '' };
  }
  if (!_ffmpegPath) return { ok: false, error: 'ffmpeg-static não encontrado no coletor', log: '' };
  return await new Promise((resolve) => {
    const args = [
      '-hide_banner', '-loglevel', 'info',
      '-rtsp_transport', transport,
      '-stimeout', '8000000',           // 8s socket timeout
      '-analyzeduration', '3000000',
      '-i', url,
      '-t', '1', '-f', 'null', '-',
    ];
    let stderr = '';
    let done = false;
    const p = spawn(_ffmpegPath, args, { windowsHide: true });
    p.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 40000) stderr = stderr.slice(-40000);
    });
    const kill = setTimeout(() => {
      try { p.kill('SIGKILL'); } catch {}
    }, 15000);
    p.on('error', (e) => {
      if (done) return; done = true; clearTimeout(kill);
      resolve({ ok: false, error: `ffmpeg não pôde ser iniciado: ${e.message}`, log: '' });
    });
    p.on('close', (code) => {
      if (done) return; done = true; clearTimeout(kill);
      const hasStream = /Stream #0/i.test(stderr);
      const ok = hasStream;
      // extrai info do vídeo
      const m = stderr.match(/Stream #0[^\n]*Video:\s*([^\s,]+)[^\n]*?(\d{2,4}x\d{2,4})[^\n]*/i);
      const info = m ? { codec: m[1], resolucao: m[2] } : null;
      let error = null;
      if (!ok) {
        if (/401\s*Unauthorized/i.test(stderr)) error = 'Usuário ou senha rejeitados pela câmera (401 Unauthorized).';
        else if (/403\s*Forbidden/i.test(stderr)) error = 'Câmera respondeu 403 Forbidden — conta sem permissão RTSP.';
        else if (/404\s*Not\s*Found/i.test(stderr)) error = 'Caminho RTSP não existe nesta câmera (404 Not Found). Verifique o path do fabricante.';
        else if (/Connection refused/i.test(stderr)) error = 'Conexão recusada — a porta RTSP (554) está fechada ou o RTSP está desabilitado na câmera.';
        else if (/Connection timed out|timeout|timed out/i.test(stderr)) error = 'Timeout — a câmera não respondeu. Verifique IP, rede/VLAN e firewall.';
        else if (/No route to host/i.test(stderr)) error = 'Sem rota até o host — está em outra rede/VLAN?';
        else if (/method DESCRIBE failed/i.test(stderr)) error = 'Câmera rejeitou o DESCRIBE do RTSP — credencial errada ou path inválido.';
        else if (/hevc|h265/i.test(stderr) && !hasStream) error = 'A câmera está transmitindo em HEVC/H.265 e o ffmpeg não conseguiu abrir. Configure o stream secundário em H.264.';
        else {
          const tail = stderr.split('\n').map(l => l.trim()).filter(Boolean).slice(-4).join(' | ');
          error = tail || 'Falha desconhecida ao abrir o stream.';
        }
      }
      resolve({ ok, info, transport, error, log: stderr.slice(-6000) });
    });
  });
});
// trigger build
