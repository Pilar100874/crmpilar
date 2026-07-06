// Coletor de câmeras: testa conectividade e captura snapshot das câmeras
// cadastradas no CRM e reporta ao servidor. Suporta:
//   - HTTP/HTTPS snapshot (Hikvision, Intelbras, genéricas) com Basic + Digest
//   - RTSP: status via handshake OPTIONS TCP + snapshot via ffmpeg (se disponível)
const http = require('http');
const https = require('https');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

function pathFor(marca, snapshotPath) {
  if (snapshotPath) return snapshotPath;
  switch ((marca || '').toLowerCase()) {
    case 'hikvision': return '/ISAPI/Streaming/channels/101/picture';
    case 'intelbras': return '/cgi-bin/snapshot.cgi';
    case 'tplink_tapo': return '/stream1'; // caminho RTSP padrão Tapo
    default: return '/snapshot.jpg';
  }
}

function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

function parseDigestChallenge(header) {
  const out = {};
  const clean = header.replace(/^Digest\s+/i, '');
  const re = /(\w+)=(?:"([^"]*)"|([^,]*))/g;
  let m;
  while ((m = re.exec(clean))) out[m[1]] = m[2] ?? m[3];
  return out;
}

function buildDigestHeader(user, pass, method, uri, challenge) {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop;
  const algorithm = (challenge.algorithm || 'MD5').toUpperCase();
  const opaque = challenge.opaque;
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  let response;
  if (qop) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop.split(',')[0].trim()}:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }
  const parts = [
    `username="${user}"`, `realm="${realm}"`, `nonce="${nonce}"`,
    `uri="${uri}"`, `algorithm=${algorithm}`, `response="${response}"`,
  ];
  if (qop) parts.push(`qop=${qop.split(',')[0].trim()}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  if (opaque) parts.push(`opaque="${opaque}"`);
  return 'Digest ' + parts.join(', ');
}

function doRequest(opts, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = opts.protocol === 'https:' ? https : http;
    const req = lib.request({ ...opts, headers: { ...(opts.headers || {}), ...extraHeaders } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

// ============ RTSP ============
// Handshake mínimo: envia OPTIONS via TCP. Se recebermos "RTSP/1.0" na resposta
// (mesmo que 401 Unauthorized), a câmera está viva.
function rtspOptions(host, port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    let buf = '';
    const done = (err, ok, status) => {
      try { sock.destroy(); } catch (_) {}
      if (err) return reject(err);
      resolve({ ok, status });
    };
    sock.setTimeout(timeoutMs);
    sock.once('timeout', () => done(new Error('timeout')));
    sock.once('error', (e) => done(e));
    sock.once('connect', () => {
      const req =
        `OPTIONS rtsp://${host}:${port}/ RTSP/1.0\r\n` +
        `CSeq: 1\r\n` +
        `User-Agent: PilarColetor\r\n\r\n`;
      sock.write(req);
    });
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const m = /^RTSP\/1\.0\s+(\d{3})/m.exec(buf);
      if (m) {
        // Qualquer resposta RTSP (200, 401, 403...) prova que a câmera está viva
        done(null, true, parseInt(m[1], 10));
      }
      if (buf.length > 4096) done(null, false, 0);
    });
    sock.connect(port, host);
  });
}

// Localiza binário do ffmpeg — prioriza o ffmpeg-static embutido no instalador
// (dependência do coletor), caindo para $FFMPEG_PATH / PATH / caminhos comuns.
let _ffmpegPath = null;
function findFfmpeg() {
  if (_ffmpegPath !== null) return _ffmpegPath;

  // 1) ffmpeg-static embutido no app (funciona sem nenhuma instalação manual)
  try {
    let bundled = require('ffmpeg-static');
    if (bundled) {
      // Em empacotamento Electron (asar), o binário é desempacotado em app.asar.unpacked
      if (bundled.includes('app.asar') && !bundled.includes('app.asar.unpacked')) {
        bundled = bundled.replace('app.asar', 'app.asar.unpacked');
      }
      if (fs.existsSync(bundled)) { _ffmpegPath = bundled; return bundled; }
    }
  } catch (_) {}

  // 2) Fallbacks — ffmpeg já instalado no sistema
  const candidates = [
    process.env.FFMPEG_PATH,
    'ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (c === 'ffmpeg' || (c.includes('/') || c.includes('\\'))) {
        if (c === 'ffmpeg' || fs.existsSync(c)) { _ffmpegPath = c; return c; }
      }
    } catch (_) {}
  }
  _ffmpegPath = false;
  return false;
}

function fetchRtspSnapshot(cam) {
  return new Promise((resolve, reject) => {
    const ff = findFfmpeg();
    if (!ff) return reject(new Error('ffmpeg não encontrado — instale ffmpeg no PC do Coletor para snapshot RTSP'));
    const host = cam.host;
    const port = cam.porta || 554;
    const streamPath = cam.snapshot_path || '/stream1';
    const auth = cam.usuario ? `${encodeURIComponent(cam.usuario)}:${encodeURIComponent(cam.senha || '')}@` : '';
    const url = `rtsp://${auth}${host}:${port}${streamPath.startsWith('/') ? streamPath : '/' + streamPath}`;
    const tmp = path.join(os.tmpdir(), `pilar-snap-${cam.id || Date.now()}.jpg`);
    // -rtsp_transport tcp: mais confiável em LAN, evita perda UDP
    const args = ['-y', '-rtsp_transport', 'tcp', '-i', url, '-frames:v', '1', '-q:v', '3', tmp];
    const proc = spawn(ff, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });
    const killTimer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch (_) {} }, 15000);
    proc.on('close', (code) => {
      clearTimeout(killTimer);
      if (code === 0 && fs.existsSync(tmp)) {
        try {
          const bytes = fs.readFileSync(tmp);
          fs.unlink(tmp, () => {});
          resolve({ bytes, contentType: 'image/jpeg' });
        } catch (e) { reject(e); }
      } else {
        reject(new Error(`ffmpeg falhou (code=${code}) ${err.split('\n').slice(-3).join(' ').slice(0, 200)}`));
      }
    });
    proc.on('error', reject);
  });
}

// ============ HTTP snapshot (Hikvision/Intelbras/genéricas) ============
async function fetchHttpSnapshot(cam) {
  const isHttps = (cam.protocolo || 'http') === 'https';
  const port = cam.porta || (isHttps ? 443 : 80);
  const uri = pathFor(cam.marca, cam.snapshot_path);
  const baseOpts = {
    hostname: cam.host, port, path: uri, method: 'GET',
    protocol: isHttps ? 'https:' : 'http:',
    rejectUnauthorized: false, timeout: 8000, headers: {},
  };
  if (cam.usuario) {
    const basic = Buffer.from(`${cam.usuario}:${cam.senha || ''}`).toString('base64');
    baseOpts.headers['Authorization'] = `Basic ${basic}`;
  }
  let resp = await doRequest(baseOpts);
  if (resp.status === 401 && cam.usuario) {
    const wa = resp.headers['www-authenticate'] || '';
    if (/^Digest/i.test(wa)) {
      const challenge = parseDigestChallenge(wa);
      const digest = buildDigestHeader(cam.usuario, cam.senha || '', 'GET', uri, challenge);
      resp = await doRequest({ ...baseOpts, headers: {} }, { Authorization: digest });
    }
  }
  if (resp.status !== 200) throw new Error(`HTTP ${resp.status} de ${cam.host}`);
  return { bytes: resp.body, contentType: resp.headers['content-type'] || 'image/jpeg' };
}

// Snapshot unificado — roteia por protocolo/porta
async function fetchSnapshot(cam) {
  const isRtsp = (cam.protocolo || '').toLowerCase() === 'rtsp' || cam.porta === 554;
  if (isRtsp) return await fetchRtspSnapshot(cam);
  return await fetchHttpSnapshot(cam);
}

// Status probe — para RTSP faz apenas OPTIONS; para HTTP tenta snapshot
async function probeStatus(cam) {
  const isRtsp = (cam.protocolo || '').toLowerCase() === 'rtsp' || cam.porta === 554;
  if (isRtsp) {
    const r = await rtspOptions(cam.host, cam.porta || 554);
    return { online: r.ok, extra: `RTSP OPTIONS ${r.status}` };
  }
  // HTTP: se snapshot funcionar, online
  await fetchHttpSnapshot(cam);
  return { online: true, extra: 'HTTP 200' };
}

async function listarCameras(cfg) {
  const resp = await fetch(`${cfg.url}/functions/v1/cv-coletor-cameras`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify({ filial_id: cfg.filialId || null }),
  });
  if (!resp.ok) throw new Error(`listar câmeras HTTP ${resp.status}`);
  const json = await resp.json();
  return json.cameras || [];
}

async function enviarSnapshot(cfg, cam, snap) {
  try {
    const resp = await fetch(`${cfg.url}/functions/v1/cv-coletor-cameras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({
        action: 'upload_snapshot',
        camera_id: cam.id,
        content_type: snap.contentType,
        image_base64: snap.bytes.toString('base64'),
      }),
    });
    if (!resp.ok) throw new Error(`upload snapshot HTTP ${resp.status}`);
  } catch (e) {
    console.error('[cameras] upload snapshot', cam.nome, e.message);
  }
}

async function reportarStatus(cfg, resultados) {
  try {
    await fetch(`${cfg.url}/functions/v1/cv-coletor-cameras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({
        action: 'report_status',
        reports: resultados.map(r => ({ id: r.id, status: r.status, erro: r.erro })),
      }),
    });
  } catch (e) {
    console.error('[cameras] report_status', e.message);
  }
}

async function verificarCameras(cfg) {
  const cams = await listarCameras(cfg);
  const resultados = [];
  const ffAvailable = !!findFfmpeg();
  for (const cam of cams) {
    const inicio = Date.now();
    const isRtsp = (cam.protocolo || '').toLowerCase() === 'rtsp' || cam.porta === 554;
    try {
      // 1) Confirma que a câmera está viva (OPTIONS para RTSP, snapshot HTTP p/ resto)
      const probe = await probeStatus(cam);
      // 2) Snapshot: HTTP sempre; RTSP só se ffmpeg presente (não derruba o status)
      if (isRtsp) {
        if (ffAvailable) {
          try {
            const snap = await fetchRtspSnapshot(cam);
            await enviarSnapshot(cfg, cam, snap);
          } catch (e) {
            console.warn('[cameras] snapshot RTSP falhou (status permanece online):', cam.nome, e.message);
          }
        }
      } else {
        try {
          const snap = await fetchHttpSnapshot(cam);
          await enviarSnapshot(cfg, cam, snap);
        } catch (_) {}
      }
      resultados.push({
        id: cam.id, nome: cam.nome, host: cam.host, tipo_rede: cam.tipo_rede,
        status: 'online', latencia_ms: Date.now() - inicio, erro: null,
      });
    } catch (e) {
      resultados.push({
        id: cam.id, nome: cam.nome, host: cam.host, tipo_rede: cam.tipo_rede,
        status: 'offline', latencia_ms: Date.now() - inicio, erro: e.message,
      });
    }
  }
  if (resultados.length) await reportarStatus(cfg, resultados);
  return resultados;
}

module.exports = { verificarCameras, fetchSnapshot, listarCameras, findFfmpeg };
