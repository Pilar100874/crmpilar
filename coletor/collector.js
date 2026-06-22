// Coletor: poll de equipamentos cadastrados no Supabase, busca batidas via TCP/IP e envia.
const { createClient } = require('@supabase/supabase-js');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(require('os').homedir(), '.ponto-coletor.json');
const STATE = {
  running: false,
  lastSync: null,
  totalSent: 0,
  errors: 0,
  equipamentos: [],
};

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); }
  catch { return { url: '', anonKey: '', email: '', password: '' }; }
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }

let supabase = null;
let timer = null;

async function ensureClient() {
  const cfg = loadConfig();
  if (!cfg.url || !cfg.anonKey) throw new Error('Configure URL e chave do Supabase');
  if (!supabase) {
    supabase = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } });
    if (cfg.email && cfg.password) {
      await supabase.auth.signInWithPassword({ email: cfg.email, password: cfg.password });
    }
  }
  return supabase;
}

// Stub TCP/IP — protocolos reais (REP-A, Control iD, ZKTeco) seriam implementados aqui.
function lerBatidas(equip) {
  return new Promise((resolve) => {
    if (!equip.ip) return resolve([]);
    const sock = new net.Socket();
    const timeoutId = setTimeout(() => { sock.destroy(); resolve([]); }, 5000);
    sock.connect(equip.porta || 4370, equip.ip, () => {
      clearTimeout(timeoutId);
      // Protocolo simulado: REP responderia com lote de NSRs.
      // Aqui apenas marca como online; integração real conforme manual do fabricante.
      sock.end();
      resolve([]);
    });
    sock.on('error', () => { clearTimeout(timeoutId); resolve([]); });
  });
}

async function pollOnce() {
  try {
    const sb = await ensureClient();
    const { data: equips, error } = await sb.from('ponto_equipamentos').select('*').eq('ativo', true);
    if (error) throw error;
    STATE.equipamentos = equips || [];
    for (const eq of STATE.equipamentos) {
      const batidas = await lerBatidas(eq);
      await sb.from('ponto_equipamentos').update({
        ultima_sync: new Date().toISOString(),
        status: 'online',
      }).eq('id', eq.id);
      for (const b of batidas) {
        const hash = crypto.createHash('sha256').update(JSON.stringify(b)).digest('hex');
        await sb.from('ponto_registros').insert({
          funcionario_id: b.funcionario_id,
          equipamento_id: eq.id,
          data_hora: b.data_hora,
          tipo: b.tipo || 'entrada',
          origem: 'relogio',
          nsr: b.nsr,
          hash_assinatura: hash,
        });
        STATE.totalSent++;
      }
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
  timer = setInterval(pollOnce, 60_000);
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
