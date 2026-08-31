// Comandos remotos do CRM para este equipamento (appliance/desktop).
// O CRM não alcança a máquina; então o Coletor faz um "heartbeat" periódico
// e executa o comando pendente (hoje: atualizar_versao).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { loadConfig } = require('./collector');
const { checarAtualizacao, baixarEInstalar } = require('./updater');

const KEY_PATH = path.join(os.homedir(), '.coletor-device-key');
let timer = null;
let ultimoStatus = { registrado: false, ultimoContato: null, erro: null };

function deviceKey() {
  try {
    if (fs.existsSync(KEY_PATH)) {
      const k = fs.readFileSync(KEY_PATH, 'utf-8').trim();
      if (k) return k;
    }
  } catch {}
  const nova = crypto.randomUUID();
  try { fs.writeFileSync(KEY_PATH, nova, { mode: 0o600 }); } catch {}
  return nova;
}

async function chamar(corpo) {
  const cfg = loadConfig();
  const resp = await fetch(`${cfg.url}/functions/v1/coletor-dispositivo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify(corpo),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
  return json;
}

async function executarAtualizacao() {
  const info = await checarAtualizacao();
  if (info.erro) throw new Error(info.erro);
  if (!info.atualizacaoDisponivel || !info.downloadUrl) {
    return `Já está na versão mais recente (${info.localVersion}).`;
  }
  await baixarEInstalar(info.downloadUrl, () => {});
  return `Atualizando para a versão ${info.remoteVersion}...`;
}

async function pulso() {
  const cfg = loadConfig();
  try {
    const resp = await chamar({
      acao: 'heartbeat',
      device_key: deviceKey(),
      hostname: os.hostname(),
      plataforma: `${process.platform} ${os.release()}`,
      versao: app.getVersion(),
      unidade_id: cfg.filialId || null,
      unidade_nome: cfg.filialNome || null,
    });
    ultimoStatus = { registrado: true, ultimoContato: new Date().toISOString(), erro: null };

    if (resp.comando === 'atualizar_versao') {
      console.log('[coletor] comando remoto recebido: atualizar_versao');
      try {
        const msg = await executarAtualizacao();
        await chamar({ acao: 'ack', device_key: deviceKey(), status: 'concluido', resultado: msg });
      } catch (e) {
        await chamar({ acao: 'ack', device_key: deviceKey(), status: 'erro', resultado: String(e.message || e) })
          .catch(() => {});
      }
    }
  } catch (e) {
    ultimoStatus = { ...ultimoStatus, erro: String(e.message || e) };
  }
}

function startRemoto() {
  if (timer) return;
  pulso();
  timer = setInterval(pulso, 60 * 1000);
  console.log('[coletor] comandos remotos ativos (heartbeat 60s)');
}

function stopRemoto() {
  if (timer) clearInterval(timer);
  timer = null;
}

function statusRemoto() {
  return { ...ultimoStatus, deviceKey: deviceKey() };
}

module.exports = { startRemoto, stopRemoto, statusRemoto, deviceKey };
