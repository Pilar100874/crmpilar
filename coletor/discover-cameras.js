// Descoberta automática de câmeras na rede interna.
// Suporta: hikvision, intelbras, tplink_tapo, generica_onvif.
// Estratégia por IP na sub-rede /24 local:
//   1) TCP probe rápido (80/554/8000) — só continua se algo estiver aberto
//   2) Probe específico por fabricante (HTTP ISAPI/CGI ou ONVIF SOAP)
//   3) RTSP OPTIONS para validar credenciais (fallback)
// Retorna { ip, marca, modelo, porta, rtsp_url, snapshot_path, auth_ok }

const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const dgram = require('dgram');
const crypto = require('crypto');

// ─── Sub-rede local ──────────────────────────────────────────────────────
function detectLocalSubnets() {
  const ifs = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(ifs)) {
    for (const it of ifs[name] || []) {
      if (it.family !== 'IPv4' || it.internal) continue;
      // aceita apenas privadas (10/8, 172.16-31/12, 192.168/16)
      const p = it.address.split('.').map(Number);
      const priv =
        p[0] === 10 ||
        (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
        (p[0] === 192 && p[1] === 168);
      if (!priv) continue;
      out.push({ iface: name, ip: it.address, netmask: it.netmask });
    }
  }
  return out;
}

function enumerateIPs(baseIp) {
  // usa apenas /24 (últimos 254 IPs) — suficiente para redes de escritório
  const p = baseIp.split('.');
  const list = [];
  for (let i = 1; i <= 254; i++) list.push(`${p[0]}.${p[1]}.${p[2]}.${i}`);
  return list;
}

// ─── TCP probe ───────────────────────────────────────────────────────────
function tcpProbe(host, port, timeoutMs = 700) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (ok) => { if (done) return; done = true; try { sock.destroy(); } catch {} resolve(ok); };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    try { sock.connect(port, host); } catch { finish(false); }
  });
}

// ─── HTTP com Basic+Digest ───────────────────────────────────────────────
function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

function parseDigest(header) {
  const out = {};
  const clean = header.replace(/^Digest\s+/i, '');
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let m; while ((m = re.exec(clean))) out[m[1]] = m[2] ?? m[3];
  return out;
}

function buildDigest(user, pass, method, uri, c) {
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${user}:${c.realm || ''}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  const qop = c.qop ? c.qop.split(',')[0].trim() : null;
  const response = qop
    ? md5(`${ha1}:${c.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${c.nonce}:${ha2}`);
  const parts = [
    `username="${user}"`, `realm="${c.realm || ''}"`, `nonce="${c.nonce || ''}"`,
    `uri="${uri}"`, `algorithm=${(c.algorithm || 'MD5')}`, `response="${response}"`,
  ];
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  if (c.opaque) parts.push(`opaque="${c.opaque}"`);
  return 'Digest ' + parts.join(', ');
}

function httpReq(opts, body, extraHeaders = {}, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const lib = opts.protocol === 'https:' ? https : http;
    const req = lib.request({
      ...opts,
      timeout: timeoutMs,
      rejectUnauthorized: false,
      headers: { ...(opts.headers || {}), ...extraHeaders },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (body) req.write(body);
    req.end();
  });
}

async function httpGetAuth(host, port, path, user, pass, isHttps = false) {
  const baseOpts = {
    hostname: host, port, path, method: 'GET',
    protocol: isHttps ? 'https:' : 'http:',
    headers: {},
  };
  if (user) {
    baseOpts.headers['Authorization'] =
      'Basic ' + Buffer.from(`${user}:${pass || ''}`).toString('base64');
  }
  let r = await httpReq(baseOpts);
  if (r.status === 401 && user) {
    const wa = r.headers['www-authenticate'] || '';
    if (/^Digest/i.test(wa)) {
      const digest = buildDigest(user, pass || '', 'GET', path, parseDigest(wa));
      r = await httpReq({ ...baseOpts, headers: {} }, null, { Authorization: digest });
    }
  }
  return r;
}

// ─── Probes por fabricante ───────────────────────────────────────────────
async function probeHikvision(ip, user, pass) {
  // porta 80 primeiro; se falhar tenta 8000 (comum em NVR)
  for (const port of [80, 8000]) {
    if (!(await tcpProbe(ip, port))) continue;
    try {
      const r = await httpGetAuth(ip, port, '/ISAPI/System/deviceInfo', user, pass);
      if (r.status === 200 && /hikvision|deviceInfo/i.test(r.body)) {
        const modelo = (r.body.match(/<model>([^<]+)<\/model>/i) || [])[1] || 'Hikvision';
        return {
          marca: 'hikvision', modelo, porta: port, protocolo: port === 443 ? 'https' : 'http',
          snapshot_path: '/ISAPI/Streaming/channels/101/picture',
          rtsp_template: `rtsp://{user}:{pass}@${ip}:554/Streaming/Channels/101`,
          auth_ok: true, http_port: port,
        };
      }
      if (r.status === 401) {
        // câmera existe mas credencial errada
        return { marca: 'hikvision', modelo: 'Hikvision', porta: port, protocolo: 'http',
          snapshot_path: '/ISAPI/Streaming/channels/101/picture',
          rtsp_template: `rtsp://{user}:{pass}@${ip}:554/Streaming/Channels/101`,
          auth_ok: false, http_port: port };
      }

    } catch {}
  }
  return null;
}

async function probeIntelbras(ip, user, pass) {
  for (const port of [80]) {
    if (!(await tcpProbe(ip, port))) continue;
    try {
      const r = await httpGetAuth(ip, port, '/cgi-bin/magicBox.cgi?action=getDeviceType', user, pass);
      if (r.status === 200 && /type\s*=/i.test(r.body)) {
        const modelo = (r.body.match(/type\s*=\s*(\S+)/i) || [])[1] || 'Intelbras';
        return {
          marca: 'intelbras', modelo, porta: port, protocolo: 'http',
          snapshot_path: '/cgi-bin/snapshot.cgi',
          rtsp_template: `rtsp://{user}:{pass}@${ip}:554/cam/realmonitor?channel=1&subtype=0`,
          auth_ok: true, http_port: port,
        };
      }
      if (r.status === 401) {
        return { marca: 'intelbras', modelo: 'Intelbras', porta: port, protocolo: 'http',
          snapshot_path: '/cgi-bin/snapshot.cgi',
          rtsp_template: `rtsp://{user}:{pass}@${ip}:554/cam/realmonitor?channel=1&subtype=0`,
          auth_ok: false, http_port: port };
      }

    } catch {}
  }
  return null;
}

// RTSP OPTIONS com autenticação Digest — para Tapo/genéricas
function rtspOptions(host, port, path, user, pass, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let buf = '';
    let cseq = 1;
    let stage = 0; // 0 = sem auth, 1 = com digest
    let done = false;
    const finish = (result) => { if (done) return; done = true; try { sock.destroy(); } catch {} resolve(result); };
    sock.setTimeout(timeoutMs);
    sock.once('timeout', () => finish({ alive: false }));
    sock.once('error', () => finish({ alive: false }));
    sock.once('connect', () => {
      const url = `rtsp://${host}:${port}${path}`;
      sock.write(
        `OPTIONS ${url} RTSP/1.0\r\nCSeq: ${cseq}\r\nUser-Agent: PilarColetor\r\n\r\n`
      );
    });
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const statusM = /^RTSP\/1\.0\s+(\d{3})/m.exec(buf);
      if (!statusM) { if (buf.length > 8192) finish({ alive: true, auth_ok: false }); return; }
      const status = parseInt(statusM[1], 10);
      if (status === 200) return finish({ alive: true, auth_ok: !!user });
      if (status === 401 && stage === 0 && user) {
        stage = 1;
        const waMatch = /WWW-Authenticate:\s*(Digest[^\r\n]+)/i.exec(buf);
        if (!waMatch) return finish({ alive: true, auth_ok: false });
        const url = `rtsp://${host}:${port}${path}`;
        const digest = buildDigest(user, pass || '', 'OPTIONS', url, parseDigest(waMatch[1]));
        cseq++; buf = '';
        sock.write(
          `OPTIONS ${url} RTSP/1.0\r\nCSeq: ${cseq}\r\nAuthorization: ${digest}\r\nUser-Agent: PilarColetor\r\n\r\n`
        );
        return;
      }
      // qualquer outra resposta RTSP: câmera viva
      finish({ alive: true, auth_ok: status === 200 });
    });
    try { sock.connect(port, host); } catch { finish({ alive: false }); }
  });
}

async function probeTapo(ip, user, pass) {
  if (!(await tcpProbe(ip, 554))) return null;
  const r = await rtspOptions(ip, 554, '/stream1', user, pass);
  if (!r.alive) return null;
  return {
    marca: 'tplink_tapo', modelo: 'TP-Link Tapo', porta: 554, protocolo: 'rtsp',
    snapshot_path: '/stream1',
    rtsp_template: `rtsp://{user}:{pass}@${ip}:554/stream1`,
    auth_ok: r.auth_ok, http_port: null,
  };
}

async function probeGenericOnvif(ip, user, pass) {
  // tenta RTSP genérico primeiro (mais rápido que ONVIF SOAP)
  if (!(await tcpProbe(ip, 554))) return null;
  const paths = ['/', '/live', '/Streaming/Channels/101', '/cam/realmonitor?channel=1&subtype=0'];
  for (const p of paths) {
    const r = await rtspOptions(ip, 554, p, user, pass);
    if (r.alive) {
      return {
        marca: 'generica_rtsp', modelo: 'ONVIF/RTSP', porta: 554, protocolo: 'rtsp',
        snapshot_path: p,
        rtsp_template: `rtsp://{user}:{pass}@${ip}:554${p}`,
        auth_ok: r.auth_ok, http_port: null,
      };
    }
  }
  return null;
}

// ─── Orquestração ────────────────────────────────────────────────────────
const PROBES = {
  hikvision: probeHikvision,
  intelbras: probeIntelbras,
  tplink_tapo: probeTapo,
  generica_onvif: probeGenericOnvif,
};

async function probeIp(ip, marcas, user, pass) {
  for (const m of marcas) {
    const fn = PROBES[m];
    if (!fn) continue;
    try {
      const found = await fn(ip, user, pass);
      if (found) return { ip, ...found };
    } catch {}
  }
  return null;
}

// paraleliza em batches — evita saturar rede e file descriptors
async function pMapBatch(items, batchSize, fn, onProgress) {
  const results = [];
  let done = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const out = await Promise.all(chunk.map(fn));
    for (const r of out) if (r) results.push(r);
    done += chunk.length;
    try { onProgress && onProgress(done, items.length); } catch {}
  }
  return results;
}

async function discover({ marcas, user, senha, cidr, onProgress }) {
  const subnets = detectLocalSubnets();
  if (!subnets.length) throw new Error('Nenhuma sub-rede IPv4 privada detectada nesta máquina.');
  const base = cidr ? cidr.split('/')[0] : subnets[0].ip;
  const ips = enumerateIPs(base);
  // filtra próprio IP
  const selfIps = new Set(subnets.map(s => s.ip));
  const scanList = ips.filter(x => !selfIps.has(x));
  console.log(`[discover] sub-rede base ${base}, ${scanList.length} IPs, marcas=${marcas.join(',')}`);
  const found = await pMapBatch(
    scanList, 32,
    (ip) => probeIp(ip, marcas, user, senha),
    onProgress,
  );
  console.log(`[discover] concluído — ${found.length} câmera(s) encontrada(s)`);
  return { subnet_base: base, total_scanned: scanList.length, cameras: found };
}

module.exports = { discover, detectLocalSubnets };
