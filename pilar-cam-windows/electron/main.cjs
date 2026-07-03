const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fetch = require('node-fetch');
const Recorder = require('./recorder.cjs');

const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

const CONFIG_PATH = path.join(app.getPath('userData'), 'pilar-cam-config.json');
const RECORDINGS_DIR = path.join(app.getPath('userData'), 'recordings');
fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

let win;
let config = { token: '', cameras: [], gridSize: 4, retentionDays: 7, motionEnabled: false };
const recorders = new Map();
let lastMotionAt = new Map(); // throttle por câmera

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
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-device-token': config.token
      },
      body: JSON.stringify({
        tipo: 'windows',
        versao_app: '1.0.0',
        hostname: os.hostname()
      })
    });
    const json = await res.json().catch(() => ({}));
    const cfg = json.camera_config || {};
    let changed = false;
    for (const k of ['retentionDays','motionEnabled','gridSize']) {
      if (cfg[k] !== undefined && cfg[k] !== config[k]) { config[k] = cfg[k]; changed = true; }
    }
    // baixa lista de câmeras via pilar-hub-config
    const cRes = await fetch(`${SUPABASE_URL}/functions/v1/pilar-hub-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-device-token': config.token
      }
    });
    const cJson = await cRes.json().catch(() => ({}));
    if (Array.isArray(cJson.cameras)) {
      const remote = cJson.cameras.map(c => ({
        id: c.id, nome: c.nome,
        rtsp: buildRtsp(c)
      }));
      if (JSON.stringify(remote) !== JSON.stringify(config.cameras)) {
        config.cameras = remote; changed = true;
      }
    }
    if (changed) { saveConfig(); startRecorders(); win?.webContents.send('config-updated', config); }
  } catch (e) { console.error('heartbeat', e.message); }
}

function buildRtsp(c) {
  if (!c.rtsp_url) return '';
  if (c.usuario && c.senha && !c.rtsp_url.includes('@')) {
    return c.rtsp_url.replace(/^rtsp:\/\//, `rtsp://${encodeURIComponent(c.usuario)}:${encodeURIComponent(c.senha)}@`);
  }
  return c.rtsp_url;
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
      onEvent: (evt) => console.log('evt', cam.nome, evt),
      onPreviewFrame: (id, dataUrl) => win?.webContents.send('preview-frame', { id, dataUrl }),
      onMotionSnapshot: (camera, jpgBuffer) => onMotion(camera, jpgBuffer)
    });
    rec.start();
    recorders.set(cam.id, rec);
  }
}
function stopRecorders() {
  for (const r of recorders.values()) r.stop();
  recorders.clear();
}

async function onMotion(camera, jpgBuffer) {
  // throttle: máx 1 upload/câmera a cada 20s
  const now = Date.now();
  const last = lastMotionAt.get(camera.id) || 0;
  if (now - last < 20_000) return;
  lastMotionAt.set(camera.id, now);
  await uploadSnapshot(camera, jpgBuffer.toString('base64'), 'motion');
}

async function uploadSnapshot(camera, base64, origem) {
  if (!config.token) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/pilar-cam-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-device-token': config.token
      },
      body: JSON.stringify({
        camera_id: camera.id, camera_nome: camera.nome,
        origem, imagem_base64: base64, timestamp: Date.now()
      })
    });
  } catch (e) { console.error('upload', e.message); }
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
  if (!rec) return null;
  const file = await rec.snapshot();
  if (file) {
    try {
      const b64 = fs.readFileSync(file).toString('base64');
      await uploadSnapshot(rec.camera, b64, 'camera');
    } catch {}
  }
  return file;
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
