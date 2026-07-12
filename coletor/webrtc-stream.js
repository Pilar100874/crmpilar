// WebRTC live streaming: Coletor Desktop → Navegador do CRM.
// - Sinalização via Supabase Realtime broadcast (canal "webrtc-signal").
// - RTSP da câmera capturado por ffmpeg e enviado como RTP para werift.
// - werift monta a PeerConnection, gera oferta e envia SDP ao viewer.
//
// Compartilhamento de captura (v1.7.2+):
//   Um único ffmpeg por câmera alimenta N viewers via CameraPump.
//   Isso evita esgotar o limite de sessões RTSP da câmera quando várias
//   pessoas abrem o mesmo mosaico ao vivo.
//
// Tapo (v1.7.2+):
//   Live usa /stream2 (substream H.264) por padrão — /stream1 nas câmeras
//   2K (C510W/C520WS/C220/C225) costuma ser H.265, incompatível com WebRTC.
//   Snapshot continua usando /stream1 (não passa por WebRTC).
const dgram = require('dgram');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ─── Runtime patch para @shinyoshiaki/binary-data ────────────────────────────
// O pacote publica requires bare tipo require('lib/binary-stream') e guarda os
// arquivos em src/node_modules/{lib,types,internal}. No build empacotado do
// Electron isso às vezes vira "Cannot find module 'lib/binary-stream'" mesmo
// com afterPack.js. Instala um hook no Module._resolveFilename que, quando o
// require vier de dentro do pacote binary-data, tenta resolver contra src/
// e src/node_modules/. Isso garante que o webrtc-stream carregue no cliente
// final independentemente do estado do empacotamento.
try {
  const Module = require('module');
  const origResolve = Module._resolveFilename;
  const BD_MARK = path.join('@shinyoshiaki', 'binary-data');
  const INTERNAL = new Set(['lib', 'types', 'internal']);
  Module._resolveFilename = function (request, parent, ...rest) {
    try {
      return origResolve.call(this, request, parent, ...rest);
    } catch (err) {
      const clean = typeof request === 'string' ? request.replace(/\\/g, '/') : '';
      const parts = clean.split('/').filter(Boolean);
      const firstInternal = parts.findIndex((part) => INTERNAL.has(part));
      if (
        typeof request === 'string' &&
        parent && parent.filename && parent.filename.includes(BD_MARK) &&
        !request.startsWith('/') &&
        firstInternal >= 0
      ) {
        // localiza a raiz do pacote binary-data a partir do arquivo pai
        const idx = parent.filename.indexOf(BD_MARK);
        const root = parent.filename.slice(0, idx + BD_MARK.length);
        const internalPath = parts.slice(firstInternal).join('/');
        const candidates = [
          path.join(root, 'src', internalPath),
          path.join(root, 'src', internalPath + '.js'),
          path.join(root, 'src', 'node_modules', internalPath),
          path.join(root, 'src', 'node_modules', internalPath + '.js'),
          path.join(root, 'src', internalPath, 'index.js'),
          path.join(root, 'src', 'node_modules', internalPath, 'index.js'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
      throw err;
    }
  };
} catch (e) {
  console.warn('[webrtc-stream] falha ao instalar hook binary-data:', e.message);
}
// ─────────────────────────────────────────────────────────────────────────────

let WebSocketTransport = null;
try {
  const ws = require('ws');
  WebSocketTransport = ws.WebSocket || ws;
} catch {}
const {
  RTCPeerConnection,
  MediaStreamTrack,
  RTCRtpCodecParameters,
} = require('werift');


let ffmpegPath;
try { ffmpegPath = require('ffmpeg-static'); } catch { ffmpegPath = 'ffmpeg'; }
// Empacotado em asar, o binário fica em app.asar.unpacked (não dá para
// executar de dentro do asar). Ajusta o caminho em runtime.
if (ffmpegPath && ffmpegPath.includes('app.asar')) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

const H264 = new RTCRtpCodecParameters({
  mimeType: 'video/H264',
  clockRate: 90000,
  payloadType: 96,
  rtcpFeedback: [
    { type: 'nack' },
    { type: 'nack', parameter: 'pli' },
    { type: 'goog-remb' },
  ],
  parameters: 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
});

const OPUS = new RTCRtpCodecParameters({
  mimeType: 'audio/opus',
  clockRate: 48000,
  channels: 2,
  payloadType: 111,
});

function rtspUrlFor(cam) {
  // Modo manual: campos explícitos têm prioridade absoluta sobre defaults da marca.
  const manualUser = cam.rtsp_user || cam.usuario;
  const manualPass = cam.rtsp_pass || cam.senha;
  const user = manualUser ? encodeURIComponent(manualUser) : '';
  const pass = manualPass ? encodeURIComponent(manualPass) : '';
  const auth = user ? `${user}:${pass}@` : '';
  const port = cam.rtsp_porta || cam.porta_rtsp || 554;
  const host = cam.host;
  let p;
  if (cam.modo_manual && cam.rtsp_path) {
    p = cam.rtsp_path.startsWith('/') ? cam.rtsp_path : `/${cam.rtsp_path}`;
  } else {
    switch ((cam.marca || '').toLowerCase()) {
      case 'hikvision': p = cam.rtsp_path || '/Streaming/Channels/102'; break;
      case 'intelbras': p = cam.rtsp_path || '/cam/realmonitor?channel=1&subtype=1'; break;
      case 'tplink_tapo': p = cam.rtsp_path || '/stream2'; break;
      default: p = cam.rtsp_path || '/';
    }
  }
  return `rtsp://${auth}${host}:${port}${p}`;
}

class SignalHub {
  constructor(cfg, myCameraIds) {
    this.cfg = cfg;
    this.myCameraIds = new Set(myCameraIds);
    this.sessions = new Map(); // key: `${camera_id}:${viewer_id}` → session
    this.pumps = new Map();    // key: camera_id → CameraPump (compartilhado)
    this.supabase = createClient(cfg.url, cfg.anonKey, {
      realtime: {
        params: { eventsPerSecond: 20 },
        ...(WebSocketTransport ? { transport: WebSocketTransport } : {}),
      },
    });
    this.channels = [];
  }

  setCameras(ids) { this.myCameraIds = new Set(ids); }

  start() {
    if (this.channels.length) return;
    const names = new Set(['webrtc-signal']);
    if (this.cfg.filialId) names.add(`webrtc-signal:${this.cfg.filialId}`);
    for (const name of names) {
      const ch = this.supabase.channel(name, {
        config: { broadcast: { self: false, ack: false } },
      });
      ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
        this._onMsg(payload);
        if (payload?.type === 'viewer-ping' && payload?.to === 'coletor') {
          this._sendHeartbeat();
        }
      });
      ch.subscribe((status) => {
        console.log('[webrtc] signaling', name, status);
        if (status === 'SUBSCRIBED') this._sendHeartbeat();
      });
      this.channels.push(ch);
    }
    this._sendHeartbeat();
    // Heartbeat frequente (2s) — browser espera até 6s para detectar
    this.hbTimer = setInterval(() => this._sendHeartbeat(), 2000);
  }

  _sendHeartbeat() {
    this.send({
      type: 'coletor-online',
      to: 'viewers',
      filial_id: this.cfg.filialId || null,
      cameras: Array.from(this.myCameraIds),
      ts: Date.now(),
    });
  }

  stop() {
    if (this.hbTimer) { clearInterval(this.hbTimer); this.hbTimer = null; }
    for (const ch of this.channels) this.supabase.removeChannel(ch);
    this.channels = [];
    for (const s of this.sessions.values()) s.close();
    this.sessions.clear();
    for (const p of this.pumps.values()) p.stop();
    this.pumps.clear();
  }

  send(msg) {
    for (const ch of this.channels) {
      try { ch.send({ type: 'broadcast', event: 'msg', payload: msg }); } catch {}
    }
  }

  getPump(cam) {
    let pump = this.pumps.get(cam.id);
    if (pump && !pump.stopped) return pump;
    pump = new CameraPump(cam, () => this.pumps.delete(cam.id));
    this.pumps.set(cam.id, pump);
    return pump;
  }

  async _onMsg(m) {
    if (!m || m.to !== 'coletor') return;
    // Snapshot on-demand: força captura+upload imediato (sem esperar ciclo 30s)
    if (m.type === 'snapshot-now') {
      if (!this.myCameraIds.has(m.camera_id)) return;
      try {
        const cam = (this.cameras || []).find((c) => c.id === m.camera_id);
        if (!cam) return;
        const { fetchSnapshot } = require('./cameras');
        const snap = await fetchSnapshot(cam);
        const resp = await fetch(`${this.cfg.url}/functions/v1/cv-coletor-cameras`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.cfg.anonKey,
            Authorization: `Bearer ${this.cfg.anonKey}`,
          },
          body: JSON.stringify({
            action: 'upload_snapshot',
            camera_id: cam.id,
            content_type: snap.contentType,
            image_base64: snap.bytes.toString('base64'),
          }),
        });
        console.log('[webrtc] snapshot-now', cam.nome, resp.status);
      } catch (e) {
        console.error('[webrtc] snapshot-now err', e.message);
      }
      return;
    }
    if (!this.myCameraIds.has(m.camera_id)) return;

    // ============ PTZ (ONVIF) ============
    if (m.type === 'ptz') {
      try {
        const cam = (this.cameras || []).find((c) => c.id === m.camera_id);
        if (!cam || !cam.tem_ptz) return;
        const { ptzHandle } = require('./onvif-control');
        await ptzHandle(cam, m);
      } catch (e) {
        console.error('[webrtc] ptz err', e.message);
      }
      return;
    }

    // ============ TALK (áudio do viewer → câmera) ============
    if (m.type === 'talk') {
      console.log('[webrtc] talk', m.action, m.camera_id);
      return;
    }

    const key = `${m.camera_id}:${m.viewer_id}`;
    if (m.type === 'request') {
      if (this.sessions.has(key)) this.sessions.get(key).close();
      const cam = (this.cameras || []).find((c) => c.id === m.camera_id);
      if (!cam) return;
      const sess = new StreamSession(this, cam, m.viewer_id, key);
      this.sessions.set(key, sess);
      try { await sess.start(); }
      catch (e) { console.error('[webrtc] session err', e.message); sess.close(); }
    } else if (m.type === 'answer') {
      this.sessions.get(key)?.onAnswer(m.sdp);
    } else if (m.type === 'stop') {
      this.sessions.get(key)?.close();
    }
  }
}

// -----------------------------------------------------------------------------
// CameraPump: uma única captura RTSP por câmera, N viewers.
// -----------------------------------------------------------------------------
// Aloca portas UDP sequencialmente para evitar colisão entre pumps quando
// várias câmeras sobem em paralelo (tela preta / segunda câmera "carregando"
// eternamente era causado por bind() falhando em EADDRINUSE silenciosamente).
let NEXT_UDP_PORT = 40000;
const UDP_PORT_MAX = 59998;
function nextUdpPort() {
  const p = NEXT_UDP_PORT;
  NEXT_UDP_PORT += 2;
  if (NEXT_UDP_PORT > UDP_PORT_MAX) NEXT_UDP_PORT = 40000;
  return p;
}

function bindUdpWithRetry(sock, host) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tryBind = () => {
      const port = nextUdpPort();
      const onError = (err) => {
        sock.removeListener('listening', onListening);
        if (err && err.code === 'EADDRINUSE' && tries++ < 50) return tryBind();
        reject(err);
      };
      const onListening = () => {
        sock.removeListener('error', onError);
        resolve(port);
      };
      sock.once('error', onError);
      sock.once('listening', onListening);
      sock.bind(port, host);
    };
    tryBind();
  });
}

class CameraPump {
  constructor(cam, onEmpty) {
    this.cam = cam;
    this.onEmpty = onEmpty;
    this.subs = new Set(); // { videoTrack, audioTrack, onReady }
    this.videoUdp = null;
    this.audioUdp = null;
    this.videoUdpPort = 0;
    this.audioUdpPort = 0;
    this.ffmpeg = null;
    this.audioFfmpeg = null;
    this.mode = 'copy';
    this.rtpReceived = 0;
    this.audioRtpReceived = 0;
    this.starting = false;
    this.started = false;
    this.stopped = false;
  }

  async start() {
    if (this.started || this.starting) return;
    this.starting = true;

    this.videoUdp = dgram.createSocket('udp4');
    this.videoUdp.on('message', (buf) => {
      this.rtpReceived++;
      for (const s of this.subs) {
        try { s.videoTrack.writeRtp(buf); } catch {}
      }
      if (this.rtpReceived === 4) {
        // Sinaliza subs que já podem gerar offer (temos fluxo)
        for (const s of this.subs) { try { s.onReady?.(); } catch {} }
      }
    });
    try {
      this.videoUdpPort = await bindUdpWithRetry(this.videoUdp, '127.0.0.1');
    } catch (e) {
      console.error('[pump] falha bind UDP vídeo', this.cam.nome, e.message);
      this.starting = false;
      this.stop();
      return;
    }

    if (this.cam.tem_audio) {
      this.audioUdp = dgram.createSocket('udp4');
      this.audioUdp.on('message', (buf) => {
        this.audioRtpReceived++;
        for (const s of this.subs) {
          if (s.audioTrack) { try { s.audioTrack.writeRtp(buf); } catch {} }
        }
      });
      try {
        this.audioUdpPort = await bindUdpWithRetry(this.audioUdp, '127.0.0.1');
      } catch (e) {
        console.error('[pump] falha bind UDP áudio', this.cam.nome, e.message);
        try { this.audioUdp.close(); } catch {}
        this.audioUdp = null;
      }
      if (this.audioUdp) {
        try { this._spawnAudio(); } catch (e) { console.error('[pump] audio spawn:', e.message); }
      }
    }
    this._spawnVideo();
    this.started = true;

    // Fallback: 4s sem RTP em copy → reencoda (HEVC / perfil incompatível)
    setTimeout(() => {
      if (!this.stopped && this.rtpReceived === 0 && this.mode === 'copy') {
        console.log('[pump] sem RTP em copy, caindo para libx264', this.cam.nome);
        this.mode = 'encode';
        const old = this.ffmpeg;
        if (old) { old._intentionalKill = true; try { old.kill('SIGKILL'); } catch {} }
        this._spawnVideo();
      }
    }, 4000);

    // 12s sem nada e sem subs conectados → encerra (subs abandonaram)
    setTimeout(() => {
      if (!this.stopped && this.rtpReceived === 0 && this.subs.size === 0) {
        console.log('[pump] timeout sem RTP, fechando', this.cam.nome);
        this.stop();
      }
    }, 12000);
  }

  attach(sub) {
    if (this.stopped) return false;
    this.subs.add(sub);
    // Se o fluxo já está ativo, avisa este sub imediatamente
    if (this.rtpReceived > 3) { try { sub.onReady?.(); } catch {} }
    return true;
  }

  detach(sub) {
    this.subs.delete(sub);
    if (this.subs.size === 0) {
      // Gracia de 3s antes de matar — evita restart caro se outro viewer entrar já
      setTimeout(() => {
        if (this.subs.size === 0) this.stop();
      }, 3000);
    }
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    try { this.ffmpeg?.kill('SIGKILL'); } catch {}
    try { this.audioFfmpeg?.kill('SIGKILL'); } catch {}
    try { this.videoUdp?.close(); } catch {}
    try { this.audioUdp?.close(); } catch {}
    try { this.onEmpty?.(); } catch {}
  }

  _spawnVideo() {
    const rtsp = rtspUrlFor(this.cam);
    console.log('[pump] video start', this.cam.nome, 'mode=', this.mode, 'udp', this.videoUdpPort);
    const common = [
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-i', rtsp,
      '-an',
    ];
    const encArgs = this.mode === 'copy'
      ? ['-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb']
      : [
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-profile:v', 'baseline',
          '-level', '3.1',
          '-pix_fmt', 'yuv420p',
          '-g', '30',
          '-force_key_frames', 'expr:gte(t,n_forced*2)',
        ];
    const args = [
      ...common,
      ...encArgs,
      '-f', 'rtp',
      '-payload_type', '96',
      `rtp://127.0.0.1:${this.videoUdpPort}?pkt_size=1200`,
    ];
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.ffmpeg = child;
    child.stderr.on('data', (d) => {
      const s = d.toString();
      if (/error|failed|unable|invalid|denied|refused|timeout|non-monotonous|codec|not.*found|hevc|h265/i.test(s)) {
        console.log('[ffmpeg]', this.cam.nome, s.trim());
      }
    });
    const spawnedMode = this.mode;
    child.on('exit', (code) => {
      console.log('[pump] ffmpeg exit', code, this.cam.nome, 'mode=', spawnedMode, 'rtp=', this.rtpReceived);
      // Ignora exits de processos que matamos de propósito (troca copy→encode)
      if (child._intentionalKill) return;
      // Se este exit é de um processo já substituído, ignora
      if (this.ffmpeg && this.ffmpeg !== child) return;
      if (!this.stopped && spawnedMode === 'copy' && this.rtpReceived === 0) {
        this.mode = 'encode';
        this._spawnVideo();
        return;
      }
      // Se caiu com subs ativos e já teve fluxo, tenta reiniciar 1x
      if (!this.stopped && this.subs.size > 0 && this.rtpReceived > 0) {
        console.log('[pump] tentando reconectar', this.cam.nome);
        setTimeout(() => { if (!this.stopped) this._spawnVideo(); }, 1000);
        return;
      }
      this.stop();
    });
  }

  _spawnAudio() {
    const rtsp = rtspUrlFor(this.cam);
    console.log('[pump] audio start', this.cam.nome, 'udp', this.audioUdpPort);
    const args = [
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-i', rtsp,
      '-vn',
      '-c:a', 'libopus',
      '-ar', '48000',
      '-ac', '2',
      '-b:a', '64k',
      '-application', 'lowdelay',
      '-f', 'rtp',
      '-payload_type', '111',
      `rtp://127.0.0.1:${this.audioUdpPort}?pkt_size=1200`,
    ];
    this.audioFfmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.audioFfmpeg.stderr.on('data', (d) => {
      const s = d.toString();
      if (/error|failed|unable|invalid|denied|refused|timeout|no audio|does not contain any stream/i.test(s)) {
        console.log('[ffmpeg-audio]', this.cam.nome, s.trim());
      }
    });
    this.audioFfmpeg.on('exit', (code) => {
      console.log('[pump] audio ffmpeg exit', code, this.cam.nome, 'rtp=', this.audioRtpReceived);
    });
  }
}

// -----------------------------------------------------------------------------
// StreamSession: uma sessão WebRTC por viewer. Não abre RTSP direto — anexa-se
// ao CameraPump da câmera para receber RTP compartilhado.
// -----------------------------------------------------------------------------
class StreamSession {
  constructor(hub, cam, viewerId, key) {
    this.hub = hub;
    this.cam = cam;
    this.viewerId = viewerId;
    this.key = key;
    this.pc = null;
    this.offerSent = false;
    this.closed = false;
    this.sub = null;
    this.pump = null;
  }

  async start() {
    const wantAudio = !!this.cam.tem_audio;
    try {
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        codecs: {
          video: [H264],
          ...(wantAudio ? { audio: [OPUS] } : {}),
        },
      });
    } catch (e) {
      console.error('[webrtc] erro criando PC com áudio, tentando só vídeo:', e.message);
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        codecs: { video: [H264] },
      });
    }

    this.videoTrack = new MediaStreamTrack({ kind: 'video' });
    this.pc.addTransceiver(this.videoTrack, { direction: 'sendonly' });
    if (wantAudio) {
      try {
        this.audioTrack = new MediaStreamTrack({ kind: 'audio' });
        this.pc.addTransceiver(this.audioTrack, { direction: 'sendrecv' });
      } catch (e) {
        console.error('[webrtc] falha ao adicionar transceiver de áudio:', e.message);
      }
    }

    this.pump = this.hub.getPump(this.cam);
    this.sub = {
      videoTrack: this.videoTrack,
      audioTrack: this.audioTrack || null,
      onReady: () => {
        if (this.offerSent || this.closed) return;
        this.offerSent = true;
        this._sendOffer().catch((e) => console.error('[webrtc] offer err', e.message));
      },
    };
    this.pump.attach(this.sub);
    if (!this.pump.started) {
      try { await this.pump.start(); } catch (e) { console.error('[pump] start err', e.message); }
    }

    // Guarda: 25s sem offer → fecha (pump não conseguiu vídeo).
    // Elevado de 12s para dar folga ao reencode HEVC/perfil incompatível,
    // que combina 4s de espera em copy + até 8-10s para o libx264 emitir
    // o primeiro keyframe em CPUs modestas.
    setTimeout(() => {
      if (!this.closed && !this.offerSent) {
        console.log('[webrtc] timeout sem RTP para viewer', this.cam.nome);
        this.close();
      }
    }, 25000);
  }

  async _sendOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this._waitIce();
    this.hub.send({
      type: 'offer',
      to: this.viewerId,
      from: 'coletor',
      viewer_id: this.viewerId,
      camera_id: this.cam.id,
      sdp: this.pc.localDescription.sdp,
    });
    console.log('[webrtc] oferta enviada', this.cam.nome, '→', this.viewerId);
  }

  _waitIce() {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') return resolve();
      this.pc.iceGatheringStateChange.subscribe((s) => { if (s === 'complete') resolve(); });
      setTimeout(resolve, 3000);
    });
  }

  async onAnswer(sdp) {
    try {
      await this.pc.setRemoteDescription({ type: 'answer', sdp });
      console.log('[webrtc] answer aplicado', this.cam.nome);
    } catch (e) {
      console.error('[webrtc] setRemote err', e.message);
      this.close();
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.pump && this.sub) {
      try { this.pump.detach(this.sub); } catch {}
    }
    try { this.pc?.close(); } catch {}
    this.hub.sessions.delete(this.key);
  }
}

module.exports = { SignalHub };
