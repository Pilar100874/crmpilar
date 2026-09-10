// Portaria: executa na rede local os comandos enviados pelo CRM.
// O CRM (nuvem) não alcança IPs internos (192.168.x.x), então enfileira
// comandos e este módulo, rodando dentro da LAN, os executa e responde.
const http = require('http');
const https = require('https');
const { login, logout, resolverProtocolo } = require('./controlid');
const os = require('os');
const net = require('net');
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

function requisicaoBinaria(url, { method = 'GET', headers = {}, body = null, timeout = 12000 } = {}) {
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
          const bytes = Buffer.concat(chunks);
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${bytes.toString('utf-8').slice(0, 160)}`));
          }
          resolve({ bytes, contentType: res.headers['content-type'] || 'image/jpeg' });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado ao capturar a câmera do iDFace.')));
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

// Alguns Shelly ficam cadastrados com a geração errada. Tentamos o endpoint
// esperado e, se o aparelho responder 404, tentamos o da outra geração.
async function tentarUrls(urls, headers) {
  let ultimoErro = null;
  for (const url of urls) {
    try {
      return await requisicao(url, { headers });
    } catch (e) {
      ultimoErro = e;
      if (!/HTTP 40[04]/.test(String(e && e.message))) throw e;
    }
  }
  throw ultimoErro || new Error('Dispositivo não respondeu.');
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
  const rpc = `${base}/rpc/Switch.Set?id=${canal}&on=true&toggle_after=${segundos}`;
  const gen1 = `${base}/relay/${canal}?turn=on&timer=${segundos}`;
  const texto = await tentarUrls(geracao === 'gen1' ? [gen1, rpc] : [rpc, gen1], headers);
  return { mensagem: 'Relé acionado pelo Coletor local.', dados: texto.slice(0, 300) };
}

async function shellyLigar(device, cred, canal, ligar) {
  const base = baseUrlShelly(device);
  if (!base) throw new Error('Dispositivo sem IP/endpoint configurado.');
  const geracao = String((device.config && device.config.geracao) || 'gen2').toLowerCase();
  const headers = {};
  if (cred && cred.usuario && cred.senha) {
    headers.Authorization = 'Basic ' + Buffer.from(`${cred.usuario}:${cred.senha}`).toString('base64');
  }
  const rpc = `${base}/rpc/Switch.Set?id=${canal}&on=${ligar ? 'true' : 'false'}`;
  const gen1 = `${base}/relay/${canal}?turn=${ligar ? 'on' : 'off'}`;
  const texto = await tentarUrls(geracao === 'gen1' ? [gen1, rpc] : [rpc, gen1], headers);
  return { mensagem: ligar ? 'Ligado pelo Coletor local.' : 'Desligado pelo Coletor local.', dados: texto.slice(0, 300) };
}

async function shellyStatus(device, cred, canal) {
  const base = baseUrlShelly(device);
  if (!base) throw new Error('Dispositivo sem IP/endpoint configurado.');
  const geracao = String((device.config && device.config.geracao) || 'gen2').toLowerCase();
  const headers = {};
  if (cred && cred.usuario && cred.senha) {
    headers.Authorization = 'Basic ' + Buffer.from(`${cred.usuario}:${cred.senha}`).toString('base64');
  }
  // Pergunta o estado do canal certo. A resposta completa é devolvida para o
  // CRM saber se o equipamento está ligado ou desligado.
  const canalUrl = `${base}/rpc/Switch.GetStatus?id=${Number(canal) || 0}`;
  const rpc = `${base}/rpc/Shelly.GetStatus`;
  const gen1 = `${base}/status`;
  const urls = geracao === 'gen1' ? [gen1, canalUrl, rpc] : [canalUrl, rpc, gen1];
  const texto = await tentarUrls(urls, headers);
  return { mensagem: 'Dispositivo respondeu na rede local.', dados: texto.slice(0, 8000) };
}

async function shellyConfigurarSaida(device, cred, canal, cfg) {
  const base = baseUrlShelly(device);
  if (!base) throw new Error('Dispositivo sem IP/endpoint configurado.');
  const geracao = String((device.config && device.config.geracao) || 'gen2').toLowerCase();
  const headers = {};
  if (cred && cred.usuario && cred.senha) {
    headers.Authorization = 'Basic ' + Buffer.from(`${cred.usuario}:${cred.senha}`).toString('base64');
  }
  if (geracao === 'gen1') {
    const params = new URLSearchParams();
    if (cfg.modo) params.set('btn_type', cfg.modo);
    if (cfg.auto_off !== undefined) params.set('auto_off', cfg.auto_off ? 'true' : 'false');
    if (cfg.auto_off_delay !== undefined) params.set('auto_off_delay', String(cfg.auto_off_delay));
    if (cfg.power_on_state) {
      params.set('power_on_state', cfg.power_on_state === 'restore_last' ? 'last' : cfg.power_on_state);
    }
    const url = `${base}/settings/relay/${canal}?${params.toString()}`;
    const texto = await requisicao(url, { headers });
    return { mensagem: 'Configuração de saída aplicada pelo Coletor local.', dados: texto.slice(0, 300) };
  }
  const configRpc = {};
  if (cfg.modo) configRpc.in_mode = cfg.modo;
  if (cfg.auto_off !== undefined) configRpc.auto_off = cfg.auto_off;
  if (cfg.auto_off_delay !== undefined) configRpc.auto_off_delay = cfg.auto_off_delay;
  let powerOnState;
  if (cfg.power_on_state === 'off') powerOnState = 0;
  else if (cfg.power_on_state === 'on') powerOnState = 1;
  else if (cfg.power_on_state === 'restore_last') powerOnState = 2;
  if (powerOnState !== undefined) configRpc.power_on_state = powerOnState;
  const url = `${base}/rpc/Switch.SetConfig`;
  const texto = await requisicao(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: canal, config: configRpc }),
  });
  return { mensagem: 'Configuração de saída aplicada pelo Coletor local.', dados: texto.slice(0, 300) };
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

async function controlidCapturarCamera(device, cred) {
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
  const corpo = JSON.stringify({ frame_type: 'camera', camera: 'rgb' });
  try {
    const captura = await requisicaoBinaria(`${base}/save_screenshot.fcgi?session=${encodeURIComponent(sessao)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) },
      body: corpo,
    });
    if (!captura.bytes.length) throw new Error('O iDFace retornou uma imagem vazia.');
    return {
      mensagem: 'Imagem capturada pela câmera do iDFace.',
      dados: {
        imagem_base64: captura.bytes.toString('base64'),
        content_type: captura.contentType,
      },
    };
  } finally {
    try { await logout({ host, port, https: usaHttps, session: sessao }); } catch {}
  }
}

async function executarJob(job) {
  const device = job.device || {};
  const cred = job.credenciais || {};
  const params = job.parametros || {};
  const idface = String(device.tipo || '').toLowerCase() === 'idface';
  if (job.comando === 'capturar_camera') {
    if (!idface) throw new Error('Captura integrada disponível somente para o iDFace.');
    return await controlidCapturarCamera(device, cred);
  }
  if (job.comando === 'ligar' || job.comando === 'desligar') {
    if (idface) throw new Error('Liga/desliga disponível somente para Shelly.');
    return await shellyLigar(device, cred, Number(params.canal) || 0, job.comando === 'ligar');
  }
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
  saude: [],
  executados: 0,
  erros: 0,
  ultimoErro: null,
};

// ---- Verificação de atividade dos dispositivos do interfone -----------------
// Testa uma conexão TCP simples com cada equipamento para saber se está ativo.
function testarTcp(host, porta, timeout = 2500) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const socket = net.connect({ host, port: porta });
    const encerrar = (ok, erro) => {
      try { socket.destroy(); } catch {}
      resolve({ ok, ms: Date.now() - inicio, erro: erro || null });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => encerrar(true));
    socket.once('timeout', () => encerrar(false, 'Sem resposta (tempo esgotado)'));
    socket.once('error', (e) => encerrar(false, e.message));
  });
}

function portaPadrao(device) {
  if (device.porta) return Number(device.porta);
  if (device.endpoint) {
    try {
      const u = new URL(device.endpoint);
      if (u.port) return Number(u.port);
      return u.protocol === 'https:' ? 443 : 80;
    } catch {}
  }
  const proto = String((device.config && device.config.protocolo) || 'http').toLowerCase();
  return proto === 'https' ? 443 : 80;
}

function hostDoDispositivo(device) {
  if (device.ip) return device.ip;
  if (device.endpoint) {
    try { return new URL(device.endpoint).hostname; } catch {}
  }
  return null;
}

async function verificarSaude(dispositivos) {
  const lista = [];
  for (const device of dispositivos || []) {
    const host = hostDoDispositivo(device);
    const porta = portaPadrao(device);
    if (!host) {
      lista.push({
        id: device.id,
        nome: device.nome || device.identificador || 'Dispositivo',
        tipo: device.tipo || '—',
        ip: null,
        porta,
        ativo: false,
        ms: null,
        erro: 'Sem IP/endereço configurado',
        verificadoEm: new Date().toISOString(),
      });
      continue;
    }
    const r = await testarTcp(host, porta);
    lista.push({
      id: device.id,
      nome: device.nome || device.identificador || 'Dispositivo',
      tipo: device.tipo || '—',
      ip: host,
      porta,
      ativo: r.ok,
      ms: r.ms,
      erro: r.erro,
      verificadoEm: new Date().toISOString(),
    });
  }
  ESTADO.saude = lista;
  return lista;
}


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


// ---- Campainha do interfone -------------------------------------------------
// O iDFace registra o toque da campainha no log de acessos. O Coletor observa
// os registros novos e avisa o CRM, que abre o popup do interfone na hora.
const CAMPAINHA = { ultimoId: {}, iniciado: {} };
const EVENTOS_CAMPAINHA_PADRAO = [7, 8];

async function lerLogsRecentes(device, cred) {
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
  const corpo = JSON.stringify({ object: 'access_logs', order_by: ['id'], order_desc: true, limit: 10 });
  try {
    const texto = await requisicao(`${base}/load_objects.fcgi?session=${encodeURIComponent(sessao)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpo) },
      body: corpo,
    });
    const json = JSON.parse(texto);
    return json.access_logs || [];
  } finally {
    try { await logout({ host, port, https: usaHttps, session: sessao }); } catch {}
  }
}

async function verificarCampainha(cfg, dispositivos) {
  for (const device of dispositivos || []) {
    if (String(device.tipo || '').toLowerCase() !== 'idface') continue;
    if (!device.ip) continue;
    const eventos = (device.config && device.config.campainha_eventos) || EVENTOS_CAMPAINHA_PADRAO;
    try {
      const logs = await lerLogsRecentes(device, device.credenciais || {});
      if (!logs.length) continue;
      const maiorId = logs.reduce((m, l) => Math.max(m, Number(l.id) || 0), 0);
      if (!CAMPAINHA.iniciado[device.id]) {
        // Primeira leitura: apenas memoriza o ponto de partida
        CAMPAINHA.iniciado[device.id] = true;
        CAMPAINHA.ultimoId[device.id] = maiorId;
        continue;
      }
      const anterior = CAMPAINHA.ultimoId[device.id] || 0;
      const novos = logs.filter((l) => Number(l.id) > anterior);
      CAMPAINHA.ultimoId[device.id] = Math.max(anterior, maiorId);
      const tocou = novos.some((l) => eventos.includes(Number(l.event)));
      if (tocou) {
        await chamar(cfg, {
          acao: 'campainha',
          unidade_id: cfg.filialId || null,
          device_id_evento: device.id,
        });
      }
    } catch (e) {
      ESTADO.ultimoErro = e.message;
    }
  }
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
    try { await verificarSaude(ESTADO.dispositivos); } catch {}
    await verificarCampainha(cfg, ESTADO.dispositivos);
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

module.exports = { pollPortariaOnce, garantirRegistro, verificarCampainha, verificarSaude, ESTADO };
