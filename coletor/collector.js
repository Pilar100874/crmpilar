// Coletor: poll de equipamentos, busca batidas via protocolo do fabricante e envia ao CRM.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { lerBatidasControlID } = require('./controlid');

const CONFIG_PATH = path.join(require('os').homedir(), '.ponto-coletor.json');
const STATE = {
  running: false,
  lastSync: null,
  totalSent: 0,
  errors: 0,
  equipamentos: [],
  lastErrors: {},
};

// Último NSR por equipamento (evita reenviar batidas já importadas)
const lastNSRByEquip = {};

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); }
  catch { return { url: '', anonKey: '', email: '', password: '' }; }
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); supabase = null; }

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

// Despacha por marca usando o campo `modelo` cadastrado no CRM.
async function lerBatidas(equip) {
  const modelo = (equip.modelo || '').toLowerCase();
  if (modelo.includes('control') || modelo.includes('idclass') || modelo.includes('idx') || modelo.includes('idface')) {
    const lastNSR = lastNSRByEquip[equip.id] || 0;
    const novas = await lerBatidasControlID(equip, lastNSR);
    if (novas.length) lastNSRByEquip[equip.id] = Math.max(...novas.map(p => p.nsr));
    return novas;
  }
  // ZKTeco / Henry / Topdata: ainda não implementados nativamente.
  // Para esses use a importação AFD manual ou configure webhook em tempo real.
  return [];
}

async function pollOnce() {
  try {
    const sb = await ensureClient();
    const { data: equips, error } = await sb.from('ponto_equipamentos').select('*').eq('ativo', true);
    if (error) throw error;
    STATE.equipamentos = equips || [];

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

      await sb.from('ponto_equipamentos').update({
        ultima_sync: new Date().toISOString(),
        status: statusNovo,
        ultimo_erro: erroMsg,
      }).eq('id', eq.id);

      if (batidas.length === 0) continue;

      // Envia em lote pro ingest (valida chave + dedup + bloqueios)
      const cfg = loadConfig();
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
              cpf: b.cpf,
              data_hora: b.data_hora,
              tipo: b.tipo,
              equipamento_id: eq.id,
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
