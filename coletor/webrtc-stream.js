// WebRTC live streaming: Coletor Desktop → Navegador do CRM.
// - Sinalização via Supabase Realtime broadcast (canal "webrtc-signal").
// - RTSP da câmera capturado por ffmpeg e enviado como RTP para werift.
// - werift monta a PeerConnection, gera oferta e envia SDP ao viewer.
const dgram = require('dgram');
const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
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

function rtspUrlFor(cam) {
  const user = cam.usuario ? encodeURIComponent(cam.usuario) : '';
  const pass = cam.senha ? encodeURIComponent(cam.senha) : '';
  const auth = user ? `${user}:${pass}@` : '';
  const port = cam.porta_rtsp || 554;
  const host = cam.host;
  let p;
  switch ((cam.marca || '').toLowerCase()) {
    case 'hikvision': p = '/Streaming/Channels/101'; break;
    case 'intelbras': p = '/cam/realmonitor?channel=1&subtype=0'; break;
    case 'tplink_tapo': p = '/stream1'; break;
    default: p = cam.rtsp_path || '/';
  }
  return `rtsp://${auth}${host}:${port}${p}`;
}

class SignalHub {
  constructor(cfg, myCameraIds) {
    this.cfg = cfg;
    this.myCameraIds = new Set(myCameraIds);
    this.sessions = new Map(); // key: `${camera_id}:${viewer_id}` → session
    this.supabase = createClient(cfg.url, cfg.anonKey, {
      realtime: { params: { eventsPerSecond: 20 } },
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
  }

  send(msg) {
    for (const ch of this.channels) {
      try { ch.send({ type: 'broadcast', event: 'msg', payload: msg }); } catch {}
    }
  }

  async _onMsg(m) {
    if (!m || m.to !== 'coletor') return;
    if (!this.myCameraIds.has(m.camera_id)) return;
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

class StreamSession {
  constructor(hub, cam, viewerId, key) {
    this.hub = hub;
    this.cam = cam;
    this.viewerId = viewerId;
    this.key = key;
    this.pc = null;
    this.ffmpeg = null;
    this.udp = null;
    this.udpPort = 40000 + Math.floor(Math.random() * 20000);
  }

  async start() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      codecs: { video: [H264] },
    });
    this.track = new MediaStreamTrack({ kind: 'video' });
    this.pc.addTransceiver(this.track, { direction: 'sendonly' });

    // UDP receiver para RTP do ffmpeg
    this.udp = dgram.createSocket('udp4');
    this.udp.on('message', (buf) => {
      try { this.track.writeRtp(buf); } catch {}
    });
    await new Promise((r) => this.udp.bind(this.udpPort, '127.0.0.1', r));

    // Spawn ffmpeg
    const rtsp = rtspUrlFor(this.cam);
    console.log('[webrtc] start', this.cam.nome, '→ viewer', this.viewerId, 'udp', this.udpPort);
    const args = [
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-flags', 'low_delay',
      '-i', rtsp,
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',
      '-g', '30',
      '-f', 'rtp',
      '-payload_type', '96',
      `rtp://127.0.0.1:${this.udpPort}?pkt_size=1200`,
    ];
    this.ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.ffmpeg.stderr.on('data', () => {});
    this.ffmpeg.on('exit', (code) => {
      console.log('[webrtc] ffmpeg exit', code, this.cam.nome);
      this.close();
    });

    // Cria oferta e aguarda ICE gathering completo (non-trickle)
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
  }

  _waitIce() {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') return resolve();
      this.pc.iceGatheringStateChange.subscribe((s) => { if (s === 'complete') resolve(); });
      setTimeout(resolve, 3000); // fallback
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
    try { this.ffmpeg?.kill('SIGKILL'); } catch {}
    try { this.udp?.close(); } catch {}
    try { this.pc?.close(); } catch {}
    this.hub.sessions.delete(this.key);
  }
}

module.exports = { SignalHub };
