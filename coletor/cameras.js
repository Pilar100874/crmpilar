// Coletor de câmeras: testa conectividade (snapshot HTTP) das câmeras cadastradas
// no CRM e reporta status ao servidor. Suporta câmeras internas (LAN local)
// que o edge function do CRM não alcança.
// Suporta Basic e Digest Authentication (Hikvision/Intelbras usam Digest).
const http = require('http');
const https = require('https');
const crypto = require('crypto');

function pathFor(marca, snapshotPath) {
  if (snapshotPath) return snapshotPath;
  switch ((marca || '').toLowerCase()) {
    case 'hikvision': return '/ISAPI/Streaming/channels/101/picture';
    case 'intelbras': return '/cgi-bin/snapshot.cgi';
    case 'tplink_tapo': return '/stream/snapshot.jpg';
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

async function fetchSnapshot(cam) {
  const isHttps = (cam.protocolo || 'http') === 'https';
  const port = cam.porta || (isHttps ? 443 : 80);
  const uri = pathFor(cam.marca, cam.snapshot_path);
  const baseOpts = {
    hostname: cam.host, port, path: uri, method: 'GET',
    protocol: isHttps ? 'https:' : 'http:',
    rejectUnauthorized: false, timeout: 8000, headers: {},
  };

  // 1ª tentativa: Basic (ou sem auth)
  if (cam.usuario) {
    const basic = Buffer.from(`${cam.usuario}:${cam.senha || ''}`).toString('base64');
    baseOpts.headers['Authorization'] = `Basic ${basic}`;
  }
  let resp = await doRequest(baseOpts);

  // Se 401 com Digest challenge, retenta com Digest
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

// Envia o snapshot capturado ao CRM (para câmeras internas que o servidor não alcança)
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

async function verificarCameras(cfg) {
  const cams = await listarCameras(cfg);
  const resultados = [];
  for (const cam of cams) {
    const inicio = Date.now();
    try {
      const snap = await fetchSnapshot(cam);
      // Sobe a imagem para o CRM exibir (principalmente câmeras internas)
      await enviarSnapshot(cfg, cam, snap);
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
  return resultados;
}

module.exports = { verificarCameras, fetchSnapshot, listarCameras };
