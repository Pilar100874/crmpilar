const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fetch = require('node-fetch');
const Recorder = require('./recorder.cjs');

// >>> Ajuste com os dados do seu projeto Lovable Cloud <<<
const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

const CONFIG_PATH = path.join(app.getPath('userData'), 'pilar-cam-config.json');
const RECORDINGS_DIR = path.join(app.getPath('userData'), 'recordings');
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

let win;
let config = { token: '', cameras: [], gridSize: 4, retentionDays: 7, motionEnabled: false };
const recorders = new Map();

function loadConfig() {
  try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch {}
}
function saveConfig() { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); }

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, title: 'Pilar Cam',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

async function heartbeat() {
  if (!config.token) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pilar-hub-heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify({
        device_token: config.token,
        tipo_dispositivo: 'windows',
        hostname: os.hostname(),
        cameras_ativas: config.cameras.length
      })
    });
    const json = await res.json().catch(() => ({}));
    const cfg = json.config || {};
    if (cfg.camera_config) {
      // Aplica alterações vindas do CRM (retenção, motion, grid)
      Object.assign(config, cfg.camera_config);
      saveConfig();
      win?.webContents.send('config-updated', config);
    }
  } catch (e) { console.error('heartbeat', e.message); }
}

function startRecorders() {
  stopRecorders();
  for (const cam of config.cameras) {
    if (!cam.rtsp) continue;
    const rec = new Recorder({
      camera: cam,
      outputDir: path.join(RECORDINGS_DIR, cam.id),
      retentionDays: config.retentionDays,
      motionEnabled: config.motionEnabled,
      onEvent: (evt) => reportEvent(cam, evt)
    });
    rec.start();
    recorders.set(cam.id, rec);
  }
}
function stopRecorders() {
  for (const r of recorders.values()) r.stop();
  recorders.clear();
}

async function reportEvent(cam, evt) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/pilar-hub-heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      },
      body: JSON.stringify({
        device_token: config.token,
        event: { camera_id: cam.id, ...evt }
      })
    });
  } catch (e) { console.error('event', e.message); }
}

ipcMain.handle('get-config', () => config);
ipcMain.handle('save-config', (_, next) => {
  config = { ...config, ...next };
  saveConfig();
  startRecorders();
  return config;
});
ipcMain.handle('snapshot', async (_, cameraId) => {
  const rec = recorders.get(cameraId);
  return rec ? await rec.snapshot() : null;
});

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  startRecorders();
  setInterval(heartbeat, 30_000);
  heartbeat();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', stopRecorders);
