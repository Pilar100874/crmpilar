// Portaria: executa na rede local os comandos enviados pelo CRM.
// O CRM (nuvem) não alcança IPs internos (192.168.x.x), então enfileira
// comandos e este módulo, rodando dentro da LAN, os executa e responde.
const http = require('http');
const https = require('https');
const { login, logout, resolverProtocolo } = require('./controlid');
const os = require('os');
const { deviceKey } = require('./deviceKey');

function endpointFn(cfg) {
  return `${cfg.url}/functions/v1/portaria-coletor`;
}

async function chamar(cfg, corpo) {
  const resp = await fetch(endpointFn(cfg), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-coletor-token': cfg.portariaToken || '',
      'x-coletor-device': deviceKey(),
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify({ device_key: deviceKey(), ...corpo }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${resp.status}`);
  return json;
}

function requisicao(url, { method = 'GET', headers = {}, body = null, timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const alvo = new URL(url);
    const mod = alvo.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: alvo.hostname,
        port: alvo.port || (alvo.protocol === 'https:' ? 443 : 80),
        path: `${alvo.pathname}${alvo.search}`,
        method,
        headers,
        rejectUnauthorized: false,
        timeout,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const texto = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${texto.slice(0, 160)}`));
          resolve(texto);
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado ao falar com o dispositivo.')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function baseUrlShelly(device) {
  if (device.endpoint) return String(device.endpoint).replace(/\/+$/, '');
  const proto = (device.config && device.config.protocolo) || 'http';
  const porta = device.porta ? `:${device.porta}` : '';
  return `${proto}://${device.ip}${porta}`;
}

async function shellyPulso(device, cred, canal) {
  const base = baseUrlShelly(device);
  if (!base) throw new Error('Dispositivo sem IP/endpoint configurado.');
  const pulsoMs = Math.min(Math.max(Number(device.pulso_ms) || 1000, 200), 10000);
  const segundos = Math.max(1, Math.round(pulsoMs / 1000));
  const geracao = String((device.config && device.config.geracao) || 'gen2').toLowerCase();
  const headers = {};
  if (cred && cred.usuario && cred.senha) {
    headers.Authorization = 'Basic ' + Buffer.from(`${cred.usuario}:${cred.senha}`).toString('base64');
  }
  const url = geracao === 'gen1'
    ? `${base}/relay/${canal}?turn=on&timer=${segundos}`
    : `${base}/rpc/Switch.Set?id=${canal}&on=true&toggle_after=${segundos}`;
  const texto = await requisicao(url, { headers });
  return { mensagem: 'Relé acionado pelo Coletor local.', dados: texto.slice(0, 300) };
}

async function shellyStatus(device, cred, canal) {
  const base = baseUrlShelly(device);
  if (!base) throw new Error('Dispositivo sem IP/endpoint configurado.');
  const geracao = String((device.config && device.config.geracao) || 'gen2').toLowerCase();
  const headers = {};
  if (cred && cred.usuario && cred.senha) {
    headers.Authorization = 'Basic ' + Buffer.from(`${cred.usuario}:${cred.senha}`).toString('base64');
  }
  const url = geracao === 'gen1' ? `${base}/status` : `${base}/rpc/Shelly.GetStatus`;
  const texto = await requisicao(url, { headers });
  return { mensagem: 'Dispositivo respondeu na rede local.', dados: texto.slice(0, 300) };
}

async function controlidAbrir(device, cred, porta) {
  const alvo = resolverProtocolo({ ip: device.ip, porta: device.porta, https: false });
  const host = device.ip;
  const port = device.porta || alvo.porta || 80;
  const usaHttps = !!alvo.https;
  const sessao = await login({
    host, port, https: usaHttps,
    login: (cred && cred.usuario) || 'admin',
    password: (cred && cred.senha) || 'admin',
  });
  const base = `${usaHttps ? 'https' : 'http'}://${host}:${port}`;
  const corpo = JSON.stringify({ actions: [{ action: 'door', parameters: `door=${porta || 1}` }] });
  const texto = await requisicao(`${base}/execute_actions.fcgi?session=${sessao}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) },
    body: corpo,
  });
  try { await logout({ host, port, https: usaHttps, session: sessao }); } catch {}
  return { mensagem: 'Porta acionada pelo Coletor local.', dados: texto.slice(0, 300) };
}

async function controlidStatus(device, cred) {
  const alvo = resolverProtocolo({ ip: device.ip, porta: device.porta, https: false });
  const sessao = await login({
    host: device.ip,
    port: device.porta || alvo.porta || 80,
    https: !!alvo.https,
    login: (cred && cred.usuario) || 'admin',
    password: (cred && cred.senha) || 'admin',
  });
  return { mensagem: 'Login no equipamento efetuado pelo Coletor.', dados: { sessao: !!sessao } };
}

async function executarJob(job) {
  const device = job.device || {};
  const cred = job.credenciais || {};
  const params = job.parametros || {};
  const idface = String(device.tipo || '').toLowerCase() === 'idface';
  if (job.comando === 'abrir') {
    return idface
      ? await controlidAbrir(device, cred, Number(params.porta) || 1)
      : await shellyPulso(device, cred, Number(params.canal) || 0);
  }
  return idface
    ? await controlidStatus(device, cred)
    : await shellyStatus(device, cred, Number(params.canal) || 0);
}

const ESTADO = {
  ativo: false,
  ultimaSync: null,
  dispositivos: [],
  executados: 0,
  erros: 0,
  ultimoErro: null,
};

// Registra o equipamento na Portaria sem exigir digitação de chave.
async function garantirRegistro(cfg) {
  if (cfg.portariaToken) return cfg.portariaToken;
  const resp = await chamar(cfg, {
    acao: 'provisionar',
    hostname: os.hostname(),
    versao: cfg.versao || null,
    unidade_id: cfg.filialId || null,
    unidade_nome: cfg.filialNome || null,
  });
  const token = resp.token || null;
  if (token) {
    try { require('./collector').saveConfig({ portariaToken: token }); } catch {}
    cfg.portariaToken = token;
  }
  return token;
}

async function pollPortariaOnce(cfg) {
  try {
    await garantirRegistro(cfg);
  } catch (e) {
    ESTADO.ultimoErro = e.message;
    return ESTADO;
  }
  try {
    const unidadeId = cfg.filialId || null;
    const handshake = await chamar(cfg, { acao: 'handshake', versao: cfg.versao || null, unidade_id: unidadeId });
    ESTADO.dispositivos = handshake.dispositivos || [];
    const { jobs } = await chamar(cfg, { acao: 'jobs', limite: 5, unidade_id: unidadeId });
    for (const job of jobs || []) {
      let ok = true;
      let mensagem = '';
      let dados = null;
      try {
        const r = await executarJob(job);
        mensagem = r.mensagem;
        dados = r.dados;
        ESTADO.executados++;
      } catch (e) {
        ok = false;
        mensagem = e.message;
        ESTADO.erros++;
        ESTADO.ultimoErro = e.message;
      }
      await chamar(cfg, { acao: 'resultado', job_id: job.id, ok, mensagem, dados });
    }
    ESTADO.ultimaSync = new Date().toISOString();
    ESTADO.ultimoErro = ESTADO.ultimoErro && !jobs?.length ? ESTADO.ultimoErro : ESTADO.ultimoErro;
  } catch (e) {
    ESTADO.ultimoErro = e.message;
    ESTADO.erros++;
  }
  return ESTADO;
}

module.exports = { pollPortariaOnce, garantirRegistro, ESTADO };
