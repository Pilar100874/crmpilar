// Cliente HTTP real do Control iD (iDClass, iDFace, iDX, REP iDClass).
// Protocolo: REST/JSON via .fcgi (porta 80 ou 443).
// Docs: https://www.controlid.com.br/docs/access-api-pt/
//
// Fluxo:
//   1) POST /login.fcgi   { login, password } → { session }
//   2) POST /get_afd.fcgi?session=...  { mode: "671" }  → AFD em texto (P671/2021)
//   3) Logout (opcional): POST /logout.fcgi?session=...
//
// Retorna array de linhas AFD prontas para enviar ao ponto-importar-afd ou
// ao ponto-coletor-ingest (já parseadas).

const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');

function decodeChunked(buf) {
  // Decodificador de Transfer-Encoding: chunked (robusto para múltiplos chunks)
  const parts = [];
  let i = 0;
  while (i < buf.length) {
    const lineEnd = buf.indexOf('\r\n', i);
    if (lineEnd < 0) break;
    const sizeHex = buf.slice(i, lineEnd).toString('ascii').split(';')[0].trim();
    const size = parseInt(sizeHex, 16);
    if (!Number.isFinite(size) || size === 0) break;
    const start = lineEnd + 2;
    parts.push(buf.slice(start, start + size));
    i = start + size + 2; // pula \r\n final do chunk
  }
  return Buffer.concat(parts);
}

// Transporte por socket bruto — o Control iD envia cabeçalhos fora do padrão
// HTTP/1.1 que o parser do Node rejeita ("Parse Error: Invalid header value char").
// Falamos HTTP/1.0 direto no socket e parseamos a resposta manualmente.
function requestRaw(opts, body) {
  return new Promise((resolve, reject) => {
    const isHttps = opts.protocol === 'https:';
    const payload = body === undefined || body === null
      ? ''
      : (typeof body === 'string' ? body : JSON.stringify(body));
    const headers = {
      Host: `${opts.hostname}:${opts.port}`,
      Connection: 'close',
      'Content-Type': 'application/json',
      // Control iD retorna HTTP 400 se houver Content-Type sem Content-Length
      'Content-Length': Buffer.byteLength(payload),
      ...(opts.headers || {}),
    };
    const headerLines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
    const requestText = `${opts.method || 'GET'} ${opts.path || '/'} HTTP/1.1\r\n${headerLines}\r\n\r\n${payload}`;
    const chunks = [];
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const raw = Buffer.concat(chunks);
      const splitAt = raw.indexOf('\r\n\r\n');
      if (splitAt < 0) {
        return reject(new Error(`resposta inválida do relógio: ${raw.toString('utf8').slice(0, 120)}`));
      }
      const head = raw.slice(0, splitAt).toString('utf8');
      let bodyBuf = raw.slice(splitAt + 4);
      const statusMatch = head.match(/^HTTP\/\d(?:\.\d)?\s+(\d+)/i);
      const status = statusMatch ? Number(statusMatch[1]) : 0;
      const locMatch = head.match(/\r?\n\s*location:\s*([^\r\n]+)/i);
      const location = locMatch ? locMatch[1].trim() : null;
      if (/transfer-encoding:\s*chunked/i.test(head)) {
        bodyBuf = decodeChunked(bodyBuf);
      }
      resolve({ status, body: bodyBuf.toString('utf8'), headers: {}, location });
    };

    const tlsOpts = {
      host: opts.hostname,
      port: opts.port,
      rejectUnauthorized: false,       // certificado autoassinado de fábrica
      servername: opts.hostname,
      minVersion: 'TLSv1',             // firmwares antigos usam TLS 1.0/1.1
    };
    let socket;
    try {
      socket = isHttps
        ? tls.connect(tlsOpts, () => socket.write(requestText))
        : net.connect({ host: opts.hostname, port: opts.port }, () => socket.write(requestText));
    } catch (e) {
      return reject(e);
    }

    socket.setTimeout(opts.timeout || 15000);
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.once('timeout', () => { socket.destroy(); if (!finished) { finished = true; reject(new Error('timeout')); } });
    socket.once('error', (e) => { if (!finished) { finished = true; reject(e); } });
    socket.once('end', finish);
    socket.once('close', finish);
  });
}

// Segue redirecionamentos 301/302/307/308 (alguns firmwares Control iD
// redirecionam HTTP→HTTPS ou para outra porta). Máx. 4 saltos.
async function request(opts, body) {
  let cur = { ...opts };
  for (let hop = 0; hop < 4; hop++) {
    const res = await requestRaw(cur, body);
    if (![301, 302, 307, 308].includes(res.status) || !res.location) return res;
    const loc = res.location;
    const abs = loc.match(/^(https?):\/\/([^/:?#]+)(?::(\d+))?([^?#]*(?:\?[^#]*)?)?/i);
    if (abs) {
      const proto = abs[1].toLowerCase();
      cur = {
        ...cur,
        protocol: `${proto}:`,
        hostname: abs[2],
        port: abs[3] ? Number(abs[3]) : (proto === 'https' ? 443 : 80),
        path: abs[4] && abs[4] !== '' ? abs[4] : cur.path,
      };
    } else {
      // Location relativo — mantém host/porta, troca apenas o path se apontar
      // para outro recurso .fcgi; senão preserva o path original.
      cur = { ...cur, path: /\.fcgi/i.test(loc) ? loc : cur.path, protocol: cur.protocol === 'https:' ? 'https:' : 'https:' };
      // redirecionamento relativo sem esquema geralmente indica upgrade p/ HTTPS
      if (cur.protocol === 'https:' && cur.port === 80) cur.port = 443;
    }
  }
  throw new Error('excesso de redirecionamentos (HTTP 301) do relógio');
}


async function login({ host, port = 80, https: useHttps = false, login: user, password }) {
  const res = await request({
    protocol: useHttps ? 'https:' : 'http:',
    hostname: host, port, path: '/login.fcgi',
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  }, { login: user, password });
  if (res.status !== 200) throw new Error(`login falhou: HTTP ${res.status} ${res.body}`);
  const json = JSON.parse(res.body);
  if (!json.session) throw new Error(`login sem session: ${res.body}`);
  return json.session;
}

async function getAFD({ host, port = 80, https: useHttps = false, session, mode = '671' }) {
  const res = await request({
    protocol: useHttps ? 'https:' : 'http:',
    hostname: host, port, path: `/get_afd.fcgi?session=${encodeURIComponent(session)}`,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  }, { mode });
  if (res.status !== 200) throw new Error(`get_afd falhou: HTTP ${res.status} ${res.body.slice(0,200)}`);
  return res.body; // texto AFD bruto
}

async function logout({ host, port = 80, https: useHttps = false, session }) {
  try {
    await request({
      protocol: useHttps ? 'https:' : 'http:',
      hostname: host, port, path: `/logout.fcgi?session=${encodeURIComponent(session)}`,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    }, {});
  } catch { /* ignore */ }
}

// Parseia AFD P671 tipo 3: NSR(9)+Tipo(1=3)+Data(DDMMYYYY)+Hora(HHMM)+CPF(12)+TipoMarc(1)
function parseAFDPunches(afdText) {
  const out = [];
  const lines = afdText.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    if (line.length < 35) continue;
    const tipo = line.slice(9, 10);
    if (tipo !== '3') continue;
    const nsr = parseInt(line.slice(0, 9), 10);
    const dd = line.slice(10, 12);
    const mm = line.slice(12, 14);
    const yyyy = line.slice(14, 18);
    const hh = line.slice(18, 20);
    const mi = line.slice(20, 22);
    const cpf = line.slice(22, 34).replace(/\D/g, '');
    const data_hora = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
    if (!yyyy.startsWith('20')) continue;
    out.push({ nsr, cpf, data_hora, tipo: 'auto' });
  }
  return out;
}

// Auto-detecta protocolo: porta 443 sempre HTTPS, porta 80 sempre HTTP,
// outras portas respeitam o flag. Em caso de falha de protocolo, tenta o oposto.
function resolverProtocolo(equip) {
  const port = equip.porta || 80;
  if (port === 443) return true;
  if (port === 80) return false;
  return equip.usa_https === true;
}

async function tentarLogin(cfg) {
  // Tenta combinações comuns do Control iD: (porta/protocolo configurado),
  // (mesma porta protocolo oposto), (443 HTTPS), (80 HTTP).
  const tentativas = [
    { ...cfg },
    { ...cfg, https: !cfg.https },
    { ...cfg, port: 443, https: true },
    { ...cfg, port: 80, https: false },
  ];
  const vistas = new Set();
  let ultimoErro;
  for (const t of tentativas) {
    const chave = `${t.https ? 'https' : 'http'}:${t.port}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    try {
      const session = await login(t);
      return { session, cfgUsado: t };
    } catch (e) {
      ultimoErro = e;
      const msg = String(e.message || '');
      // Se for erro de credencial, não adianta tentar outras portas
      if (/login falhou: HTTP 401|unauthorized|invalid (login|password)/i.test(msg)) {
        throw new Error('Credenciais inválidas (usuário/senha do relógio). Verifique o campo Usuário e Chave de Comunicação.');
      }
      // Erros de rede/protocolo → continua tentando
      if (!/WRONG_VERSION_NUMBER|EPROTO|ECONNRESET|ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT|socket hang up|timeout|HTTP\/1\.1 400|HPE_|Parse Error/i.test(msg)) {
        // Erro não recuperável
        throw e;
      }
    }
  }
  const m = String(ultimoErro?.message || 'falha desconhecida');
  if (/ECONNRESET|socket hang up/i.test(m)) {
    throw new Error(`Relógio fechou a conexão (ECONNRESET). Possíveis causas: porta/protocolo incorretos, firewall bloqueando, ou o equipamento exige HTTPS na 443. Tente trocar a porta para 443 (HTTPS) ou 80 (HTTP) no cadastro.`);
  }
  if (/ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED/i.test(m)) {
    throw new Error(`Não foi possível alcançar ${cfg.host}:${cfg.port}. Verifique IP, rede e se o Coletor Desktop está na mesma LAN do relógio.`);
  }
  throw ultimoErro;
}

// Normaliza IP/host — aceita "https://192.168.0.1", "http://x:8080", "x/", etc.
function normalizarHost(equip) {
  let host = String(equip.ip || '').trim();
  let porta = equip.porta;
  let https = null;
  const m = host.match(/^(https?):\/\/(.+?)(?::(\d+))?(?:\/.*)?$/i);
  if (m) {
    https = m[1].toLowerCase() === 'https';
    host = m[2];
    if (m[3]) porta = Number(m[3]);
  }
  host = host.replace(/\/+$/, '');
  if (!porta) porta = https ? 443 : 80;
  if (https === null) https = resolverProtocolo({ ...equip, porta });
  return { host, porta, https };
}

// Lê batidas novas desde lastNSR (filtra após parse)
async function lerBatidasControlID(equip, lastNSR = 0) {
  const norm = normalizarHost(equip);
  let cfg = {
    host: norm.host,
    port: norm.porta,
    https: norm.https,
    login: equip.usuario || 'admin',
    // Para login no Control iD use a senha do usuário do relógio.
    // A chave de comunicação fica como fallback para instalações antigas.
    password: equip.senha || equip.chave_comunicacao || 'admin',
  };
  let session;
  const r = await tentarLogin(cfg);
  if (typeof r === 'string') session = r;
  else { session = r.session; cfg = r.cfgUsado; }
  try {
    const afd = await getAFD({ ...cfg, session, mode: '671' });
    const punches = parseAFDPunches(afd);
    return punches.filter(p => p.nsr > lastNSR);
  } finally {
    await logout({ ...cfg, session });
  }
}

module.exports = { lerBatidasControlID, parseAFDPunches, login, getAFD, logout, resolverProtocolo, tentarLogin, normalizarHost };
