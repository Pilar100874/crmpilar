// Coletor de câmeras: testa conectividade (snapshot HTTP) das câmeras cadastradas
// no CRM e reporta status ao servidor. Suporta câmeras internas (LAN local)
// que o edge function do CRM não alcança.
const http = require('http');
const https = require('https');

function pathFor(marca, snapshotPath) {
  if (snapshotPath) return snapshotPath;
  switch ((marca || '').toLowerCase()) {
    case 'hikvision': return '/ISAPI/Streaming/channels/101/picture';
    case 'intelbras': return '/cgi-bin/snapshot.cgi';
    case 'tplink_tapo': return '/stream/snapshot.jpg';
    default: return '/snapshot.jpg';
  }
}

function fetchSnapshot(cam) {
  return new Promise((resolve, reject) => {
    const isHttps = (cam.protocolo || 'http') === 'https';
    const port = cam.porta || (isHttps ? 443 : 80);
    const path = pathFor(cam.marca, cam.snapshot_path);
    const headers = {};
    if (cam.usuario) {
      const basic = Buffer.from(`${cam.usuario}:${cam.senha || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }
    const lib = isHttps ? https : http;
    const req = lib.request({
      hostname: cam.host, port, path, method: 'GET', headers,
      rejectUnauthorized: false, timeout: 8000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} de ${cam.host}`));
        resolve({ bytes: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function listarCameras(cfg) {
  // Lê câmeras ativas via REST direto do PostgREST usando anon key.
  const url = `${cfg.url}/rest/v1/cv_cameras?ativo=eq.true&select=id,nome,marca,tipo_rede,host,porta,protocolo,usuario,senha,snapshot_path,angulo_key,grupo_id`;
  const resp = await fetch(url, {
    headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
  });
  if (!resp.ok) throw new Error(`listar câmeras HTTP ${resp.status}`);
  return await resp.json();
}

async function verificarCameras(cfg) {
  const cams = await listarCameras(cfg);
  const resultados = [];
  for (const cam of cams) {
    const inicio = Date.now();
    try {
      await fetchSnapshot(cam);
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
