/**
 * Bridge GT06 (TCP binário) -> HTTPS (Supabase Edge Function)
 *
 * Rastreadores compatíveis: J6, JM01, JM-VL03, GT06N, TK103 e similares que falam protocolo GT06.
 *
 * Como funciona:
 *  - Abre um servidor TCP na porta definida por PORT (Railway injeta essa env var).
 *  - Aceita conexões dos rastreadores.
 *  - Decodifica: login (0x01), localização (0x12/0x22), heartbeat (0x13), alarme (0x16/0x26).
 *  - Responde ACK correto pra manter o tracker conectado.
 *  - Sempre que chega uma posição, faz POST HTTPS pro FORWARD_URL com JSON.
 *
 * Variáveis de ambiente (configurar no Railway):
 *   PORT           -> injetada automaticamente pelo Railway (ex: 5023 externo)
 *   FORWARD_URL    -> https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/rastreamento-posicao
 *   FORWARD_TOKEN  -> (opcional) valor de Authorization: Bearer <token>
 */

const net = require('net');
const https = require('https');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '5023', 10);
const FORWARD_URL = process.env.FORWARD_URL || '';
const FORWARD_TOKEN = process.env.FORWARD_TOKEN || '';

if (!FORWARD_URL) {
  console.warn('⚠️  FORWARD_URL não configurada — as posições recebidas NÃO serão repassadas.');
}

// ---------- Utilitários GT06 ----------

// CRC-ITU (X.25) — usado pelo GT06
function crcItu(buf) {
  const table = crcItu.table || (crcItu.table = (() => {
    const t = new Uint16Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (c >>> 1) ^ 0x8408 : c >>> 1;
      t[i] = c;
    }
    return t;
  })());
  let fcs = 0xffff;
  for (const b of buf) fcs = (fcs >>> 8) ^ table[(fcs ^ b) & 0xff];
  return (~fcs) & 0xffff;
}

// Extrai IMEI (8 bytes BCD -> 15 dígitos)
function parseImei(bcd) {
  let s = '';
  for (const b of bcd) s += ((b >> 4) & 0x0f).toString() + (b & 0x0f).toString();
  return s.replace(/^0+/, '');
}

function parseDateTime(buf) {
  // 6 bytes: YY MM DD HH mm ss (UTC)
  const [y, mo, d, h, mi, s] = buf;
  return new Date(Date.UTC(2000 + y, mo - 1, d, h, mi, s));
}

// Latitude/Longitude GT06: 4 bytes uint32, valor = graus * 30000 * 60
function parseCoord(buf) {
  const raw = buf.readUInt32BE(0);
  return raw / 1800000;
}

// Localização (protocolo 0x12 e 0x22)
function parseLocation(body) {
  if (body.length < 18) return null;
  const dt = parseDateTime(body.slice(0, 6));
  const satsAndGpsLen = body[6]; // alto = GPS info length, baixo = nº satélites
  const sats = satsAndGpsLen & 0x0f;
  let lat = parseCoord(body.slice(7, 11));
  let lon = parseCoord(body.slice(11, 15));
  const speed = body[15];                       // km/h
  const course = body.readUInt16BE(16);         // bits 0-9: heading; bits 10-13: flags
  const heading = course & 0x03ff;
  const flags = (course >> 10) & 0x3f;
  const north = (flags & 0x04) !== 0;
  const east  = (flags & 0x08) !== 0;
  const fixed = (flags & 0x10) !== 0;
  if (!north) lat = -lat;
  if (!east)  lon = -lon;
  return {
    timestamp: dt.toISOString(),
    latitude: lat,
    longitude: lon,
    speed_kmh: speed,
    heading,
    satellites: sats,
    gps_fixed: fixed,
  };
}

// ---------- Encaminhamento HTTPS ----------

function forwardPosition(payload) {
  if (!FORWARD_URL) return;
  try {
    const u = new URL(FORWARD_URL);
    const body = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (FORWARD_TOKEN) headers['Authorization'] = `Bearer ${FORWARD_TOKEN}`;

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`↗️  Forward OK [${res.statusCode}] imei=${payload.imei}`);
          } else {
            console.warn(`⚠️  Forward status=${res.statusCode} body=${chunks.slice(0, 200)}`);
          }
        });
      }
    );
    req.on('error', (e) => console.error('❌ Forward error:', e.message));
    req.write(body);
    req.end();
  } catch (e) {
    console.error('❌ Forward exception:', e.message);
  }
}

// ---------- Servidor TCP ----------

const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`🔌 Conexão de ${remote}`);
  let imei = null;
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Processa quantos pacotes couberem no buffer
    while (buffer.length >= 5) {
      // Start bytes GT06: 0x78 0x78 (curto) ou 0x79 0x79 (longo)
      const start = buffer.readUInt16BE(0);
      let headerLen, packetLen, lenFieldSize;
      if (start === 0x7878) {
        packetLen = buffer[2];          // 1 byte de length
        headerLen = 3;
        lenFieldSize = 1;
      } else if (start === 0x7979) {
        packetLen = buffer.readUInt16BE(2); // 2 bytes de length
        headerLen = 4;
        lenFieldSize = 2;
      } else {
        console.warn(`⚠️  Start byte inválido: 0x${start.toString(16)}, descartando buffer`);
        buffer = Buffer.alloc(0);
        return;
      }

      // Tamanho total do pacote = start(2) + len(1|2) + packetLen + stop(2)
      const totalLen = 2 + lenFieldSize + packetLen + 2;
      if (buffer.length < totalLen) break; // aguarda mais dados

      const packet = buffer.slice(0, totalLen);
      buffer = buffer.slice(totalLen);

      const stop = packet.readUInt16BE(packet.length - 2);
      if (stop !== 0x0d0a) {
        console.warn(`⚠️  Stop byte inválido: 0x${stop.toString(16)}`);
        continue;
      }

      const protocol = packet[headerLen];
      const contentEnd = packet.length - 6; // exclui serial(2)+crc(2)+stop(2)
      const content = packet.slice(headerLen + 1, contentEnd);
      const serial = packet.readUInt16BE(packet.length - 6);

      handlePacket(protocol, content, serial, packet, socket, (newImei) => {
        if (newImei) imei = newImei;
      }, () => imei);
    }
  });

  socket.on('close', () => console.log(`🔒 Fechou ${remote} imei=${imei || '?'}`));
  socket.on('error', (e) => console.warn(`⚠️  Erro socket ${remote}: ${e.message}`));
});

function buildResponse(protocol, serial) {
  // Resposta padrão 0x78 0x78 | len | protocol | serial(2) | crc(2) | 0x0d 0x0a
  const body = Buffer.concat([Buffer.from([0x05, protocol]), Buffer.from([(serial >> 8) & 0xff, serial & 0xff])]);
  const crc = crcItu(body);
  return Buffer.concat([
    Buffer.from([0x78, 0x78]),
    body,
    Buffer.from([(crc >> 8) & 0xff, crc & 0xff]),
    Buffer.from([0x0d, 0x0a]),
  ]);
}

function handlePacket(protocol, content, serial, rawPacket, socket, setImei, getImei) {
  switch (protocol) {
    case 0x01: {
      // Login
      const imei = parseImei(content.slice(0, 8));
      setImei(imei);
      console.log(`🔑 Login IMEI=${imei}`);
      socket.write(buildResponse(0x01, serial));
      break;
    }
    case 0x13:
    case 0x23: {
      // Heartbeat / status
      console.log(`💓 Heartbeat imei=${getImei() || '?'}`);
      socket.write(buildResponse(protocol, serial));
      break;
    }
    case 0x12:
    case 0x22:
    case 0xa0: {
      // Localização GPS
      const loc = parseLocation(content);
      if (loc) {
        const imei = getImei();
        console.log(`📍 imei=${imei} lat=${loc.latitude.toFixed(6)} lon=${loc.longitude.toFixed(6)} v=${loc.speed_kmh}km/h sats=${loc.satellites} fix=${loc.gps_fixed}`);
        forwardPosition({
          source: 'gt06-bridge',
          imei,
          protocol: '0x' + protocol.toString(16),
          ...loc,
        });
      }
      socket.write(buildResponse(protocol, serial));
      break;
    }
    case 0x16:
    case 0x26: {
      // Alarme (contém localização)
      const loc = parseLocation(content);
      const imei = getImei();
      console.log(`🚨 Alarme imei=${imei}`);
      if (loc) forwardPosition({ source: 'gt06-bridge', imei, alarm: true, protocol: '0x' + protocol.toString(16), ...loc });
      socket.write(buildResponse(protocol, serial));
      break;
    }
    default: {
      console.log(`📦 Pacote protocol=0x${protocol.toString(16)} len=${content.length} imei=${getImei() || '?'} (sem parser específico, respondendo ACK)`);
      socket.write(buildResponse(protocol, serial));
    }
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bridge GT06 escutando TCP em 0.0.0.0:${PORT}`);
  console.log(`↗️  Repassando posições para: ${FORWARD_URL || '(NÃO CONFIGURADO)'}`);
});
