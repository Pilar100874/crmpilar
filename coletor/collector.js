// Coletor: poll de equipamentos, busca batidas via protocolo do fabricante e envia ao CRM.
// PRE-CONFIGURADO: URL e Anon Key embutidas. Não exige login do usuário.
const fs = require('fs');
const path = require('path');
const { lerBatidasControlID } = require('./controlid');
const { verificarCameras } = require('./cameras');

// 🔧 Configuração embutida — substitua se republicar para outro tenant
const DEFAULT_URL = process.env.PONTO_SUPABASE_URL || 'https://ioxugupvxlcdweldocmq.supabase.co';
const DEFAULT_ANON_KEY = process.env.PONTO_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

const CONFIG_PATH = path.join(require('os').homedir(), '.ponto-coletor.json');
const STATE = {
  running: false,          // legado — indica se algum coletor está ativo
  pontoEnabled: true,
  camerasEnabled: true,
  lastSync: null,
  lastSyncCameras: null,
  totalSent: 0,
  errors: 0,
  equipamentos: [],
  cameras: [],
  lastErrors: {},
  progress: { ativo: false, etapa: 'idle', equipNome: '', indice: 0, total: 0, batidasEquip: 0 },
};

const lastNSRByEquip = {};
let timerPonto = null;
let timerCameras = null;

function loadConfig() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch {}
  return {
    url: saved.url || DEFAULT_URL,
    anonKey: saved.anonKey || DEFAULT_ANON_KEY,
    pontoEnabled: saved.pontoEnabled !== false,
    camerasEnabled: saved.camerasEnabled !== false,
  };
}
function saveConfig(cfg) {
  const cur = loadConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...cur, ...cfg }, null, 2));
}

async function callBootstrap(statusUpdates = []) {
  const cfg = loadConfig();
  const resp = await fetch(`${cfg.url}/functions/v1/ponto-coletor-bootstrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': cfg.anonKey,
      'Authorization': `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify({ status_updates: statusUpdates }),
  });
  if (!resp.ok) throw new Error(`bootstrap HTTP ${resp.status}`);
  return await resp.json();
}

async function lerBatidas(equip) {
  const modelo = (equip.modelo || '').toLowerCase();
  if (modelo.includes('control') || modelo.includes('idclass') || modelo.includes('idx') || modelo.includes('idface')) {
    const lastNSR = lastNSRByEquip[equip.id] || 0;
    const novas = await lerBatidasControlID(equip, lastNSR);
    if (novas.length) lastNSRByEquip[equip.id] = Math.max(...novas.map(p => p.nsr));
    return novas;
  }
  return [];
}

async function pollOnce() {
  try {
    STATE.progress = { ativo: true, etapa: 'bootstrap', equipNome: '', indice: 0, total: 0, batidasEquip: 0 };
    const cfg = loadConfig();
    const boot = await callBootstrap([]);
    STATE.equipamentos = boot.equipamentos || [];
    const updates = [];
    const total = STATE.equipamentos.length;
    STATE.progress.total = total;

    for (let i = 0; i < total; i++) {
      const eq = STATE.equipamentos[i];
      STATE.progress.indice = i + 1;
      STATE.progress.equipNome = eq.nome || eq.ip;
      STATE.progress.etapa = 'lendo';
      STATE.progress.batidasEquip = 0;

      let batidas = [];
      let statusNovo = 'online';
      let erroMsg = null;
      try {
        batidas = await lerBatidas(eq);
        STATE.progress.batidasEquip = batidas.length;
        delete STATE.lastErrors[eq.id];
      } catch (e) {
        statusNovo = 'offline';
        erroMsg = e.message;
        STATE.lastErrors[eq.id] = e.message;
        STATE.errors++;
      }

      const updateObj = { id: eq.id, status: statusNovo, ultimo_erro: erroMsg, ultima_sync: new Date().toISOString() };

      if (eq.solicitar_teste) {
        STATE.progress.etapa = 'testando';
        let resultado_teste = "";
        try {
          const { resolverProtocolo, tentarLogin } = require('./controlid');
          let testCfg = {
            host: eq.ip,
            port: eq.porta || 80,
            https: resolverProtocolo(eq),
            login: eq.usuario || 'admin',
            password: eq.senha || eq.chave_comunicacao || 'admin',
          };
          await tentarLogin(testCfg);
          resultado_teste = "Sucesso: Conectado com sucesso pelo Coletor Desktop!";
        } catch (e) {
          resultado_teste = `Falha: ${e.message}`;
        }
        updateObj.solicitar_teste = false;
        updateObj.resultado_teste = resultado_teste;
      }

      updates.push(updateObj);

      if (batidas.length === 0) continue;
      STATE.progress.etapa = 'enviando';
      try {
        const resp = await fetch(`${cfg.url}/functions/v1/ponto-coletor-ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-chave-comunicacao': eq.chave_comunicacao || '',
            'apikey': cfg.anonKey,
            'Authorization': `Bearer ${cfg.anonKey}`,
          },
          body: JSON.stringify({
            empresa_id: eq.empresa_id,
            equipamento_id: eq.id,
            chave_comunicacao: eq.chave_comunicacao,
            registros: batidas.map(b => ({
              cpf: b.cpf, data_hora: b.data_hora, tipo: b.tipo, equipamento_id: eq.id,
            })),
          }),
        });
        const json = await resp.json().catch(() => ({}));
        STATE.totalSent += (json.inseridos || 0);
      } catch (e) {
        STATE.errors++;
        console.error('[coletor] ingest', e.message);
      }
    }

    if (updates.length) {
      try { await callBootstrap(updates); } catch (e) { console.error('[coletor] status', e.message); }
    }
    STATE.lastSync = new Date().toISOString();
    STATE.progress = { ativo: false, etapa: 'idle', equipNome: '', indice: total, total, batidasEquip: 0 };
  } catch (e) {
    STATE.errors++;
    STATE.progress.ativo = false;
    STATE.progress.etapa = 'erro';
    console.error('[coletor]', e.message);
  }
}

async function pollCamerasOnce() {
  try {
    const cfg = loadConfig();
    const resultados = await verificarCameras(cfg);
    STATE.cameras = resultados;
    STATE.lastSyncCameras = new Date().toISOString();
  } catch (e) {
    STATE.errors++;
    console.error('[coletor-cameras]', e.message);
  }
}

function startPonto() {
  if (timerPonto) return;
  saveConfig({ pontoEnabled: true });
  STATE.pontoEnabled = true;
  STATE.running = true;
  pollOnce();
  timerPonto = setInterval(pollOnce, 15_000);
}
function stopPonto() {
  saveConfig({ pontoEnabled: false });
  STATE.pontoEnabled = false;
  if (timerPonto) clearInterval(timerPonto);
  timerPonto = null;
  STATE.running = !!timerCameras;
}
function startCameras() {
  if (timerCameras) return;
  saveConfig({ camerasEnabled: true });
  STATE.camerasEnabled = true;
  STATE.running = true;
  pollCamerasOnce();
  timerCameras = setInterval(pollCamerasOnce, 30_000);
}
function stopCameras() {
  saveConfig({ camerasEnabled: false });
  STATE.camerasEnabled = false;
  if (timerCameras) clearInterval(timerCameras);
  timerCameras = null;
  STATE.running = !!timerPonto;
}

// Compatibilidade retro
function startCollector() {
  const cfg = loadConfig();
  if (cfg.pontoEnabled) startPonto();
  if (cfg.camerasEnabled) startCameras();
  return STATE;
}
function stopCollector() {
  stopPonto();
  stopCameras();
  return STATE;
}
function getStatus() {
  return {
    ...STATE,
    pontoRunning: !!timerPonto,
    camerasRunning: !!timerCameras,
    config: loadConfig(),
  };
}
async function pollNow() {
  const tasks = [];
  if (timerPonto) tasks.push(pollOnce());
  if (timerCameras) tasks.push(pollCamerasOnce());
  await Promise.all(tasks);
  return getStatus();
}

module.exports = {
  startCollector, stopCollector, getStatus, saveConfig, loadConfig, pollNow,
  startPonto, stopPonto, startCameras, stopCameras,
};
