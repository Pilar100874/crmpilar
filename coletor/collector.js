// Coletor: poll de equipamentos, busca batidas via protocolo do fabricante e envia ao CRM.
// PRE-CONFIGURADO: URL e Anon Key embutidas. Não exige login do usuário.
const fs = require('fs');
const path = require('path');
const { lerBatidasControlID } = require('./controlid');

// 🔧 Configuração embutida — substitua se republicar para outro tenant
const DEFAULT_URL = process.env.PONTO_SUPABASE_URL || 'https://ioxugupvxlcdweldocmq.supabase.co';
const DEFAULT_ANON_KEY = process.env.PONTO_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc';

const CONFIG_PATH = path.join(require('os').homedir(), '.ponto-coletor.json');
const STATE = {
  running: false,
  lastSync: null,
  totalSent: 0,
  errors: 0,
  equipamentos: [],
  lastErrors: {},
  progress: { ativo: false, etapa: 'idle', equipNome: '', indice: 0, total: 0, batidasEquip: 0 },
};

const lastNSRByEquip = {};
let timer = null;

function loadConfig() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch {}
  return {
    url: saved.url || DEFAULT_URL,
    anonKey: saved.anonKey || DEFAULT_ANON_KEY,
  };
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }

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
    const cfg = loadConfig();
    const boot = await callBootstrap([]);
    STATE.equipamentos = boot.equipamentos || [];
    const updates = [];

    for (const eq of STATE.equipamentos) {
      let batidas = [];
      let statusNovo = 'online';
      let erroMsg = null;
      try {
        batidas = await lerBatidas(eq);
        delete STATE.lastErrors[eq.id];
      } catch (e) {
        statusNovo = 'offline';
        erroMsg = e.message;
        STATE.lastErrors[eq.id] = e.message;
        STATE.errors++;
      }

      const updateObj = { id: eq.id, status: statusNovo, ultimo_erro: erroMsg, ultima_sync: new Date().toISOString() };

      if (eq.solicitar_teste) {
        let resultado_teste = "";
        try {
          const { login, resolverProtocolo, tentarLogin } = require('./controlid');
          let testCfg = {
            host: eq.ip,
            port: eq.porta || 80,
            https: resolverProtocolo(eq),
            login: eq.usuario || 'admin',
            password: eq.chave_comunicacao || eq.senha || 'admin',
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

    // Envia status em batch
    if (updates.length) {
      try { await callBootstrap(updates); } catch (e) { console.error('[coletor] status', e.message); }
    }
    STATE.lastSync = new Date().toISOString();
  } catch (e) {
    STATE.errors++;
    console.error('[coletor]', e.message);
  }
}

function startCollector() {
  if (STATE.running) return STATE;
  STATE.running = true;
  pollOnce();
  timer = setInterval(pollOnce, 15_000);
  return STATE;
}
function stopCollector() {
  STATE.running = false;
  if (timer) clearInterval(timer);
  timer = null;
  return STATE;
}
function getStatus() { return { ...STATE, config: loadConfig() }; }

module.exports = { startCollector, stopCollector, getStatus, saveConfig, loadConfig };
