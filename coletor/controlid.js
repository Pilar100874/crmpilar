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

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const isHttps = opts.protocol === 'https:';
    const lib = isHttps ? https : http;
    // Control iD usa certificado autoassinado de fábrica — aceitar
    if (isHttps && opts.rejectUnauthorized === undefined) {
      opts.rejectUnauthorized = false;
    }
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(opts.timeout || 10000, () => { req.destroy(new Error('timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
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

// Lê batidas novas desde lastNSR (filtra após parse)
async function lerBatidasControlID(equip, lastNSR = 0) {
  const cfg = {
    host: equip.ip,
    port: equip.porta || 80,
    https: equip.usa_https === true,
    login: equip.usuario || 'admin',
    password: equip.chave_comunicacao || equip.senha || 'admin',
  };
  const session = await login(cfg);
  try {
    const afd = await getAFD({ ...cfg, session, mode: '671' });
    const punches = parseAFDPunches(afd);
    return punches.filter(p => p.nsr > lastNSR);
  } finally {
    await logout({ ...cfg, session });
  }
}

module.exports = { lerBatidasControlID, parseAFDPunches, login, getAFD, logout };
