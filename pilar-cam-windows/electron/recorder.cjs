const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

class Recorder {
  constructor({ camera, outputDir, retentionDays, motionEnabled, onEvent, onPreviewFrame, onMotionSnapshot }) {
    this.camera = camera;
    this.outputDir = outputDir;
    this.retentionDays = retentionDays;
    this.motionEnabled = motionEnabled;
    this.onEvent = onEvent;
    this.onPreviewFrame = onPreviewFrame;
    this.onMotionSnapshot = onMotionSnapshot;
    this.proc = null;
    this.previewProc = null;
    this.motionProc = null;
    this.rotateTimer = null;
    this.previewTimer = null;
    fs.mkdirSync(outputDir, { recursive: true });
  }

  start() {
    this.stop();
    // 1) Gravação contínua (segmentos 10min, sem re-encode)
    const outPattern = path.join(this.outputDir, 'seg_%Y-%m-%d_%H-%M-%S.mp4');
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', this.camera.rtsp,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_time', '600',
      '-segment_format', 'mp4',
      '-strftime', '1',
      '-reset_timestamps', '1',
      outPattern
    ];
    this.proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.proc.on('exit', (code) => {
      console.log(`[${this.camera.nome}] rec exit`, code);
      if (code !== 0 && !this.stopping) setTimeout(() => this.start(), 5000);
    });

    // 2) Preview ao vivo (snapshot JPEG a cada 2s, empurra pro renderer via IPC)
    this.previewTimer = setInterval(() => this.grabPreview(), 2000);
    this.grabPreview();

    // 3) Rotação de arquivos antigos
    this.rotateTimer = setInterval(() => this.rotate(), 60 * 60 * 1000);
    this.rotate();

    // 4) Detecção de movimento (opcional)
    if (this.motionEnabled) this.startMotion();

    this.onEvent?.({ type: 'recording_started', ts: Date.now() });
  }

  stop() {
    this.stopping = true;
    for (const p of [this.proc, this.previewProc, this.motionProc]) {
      if (p) { try { p.kill('SIGTERM'); } catch {} }
    }
    this.proc = this.previewProc = this.motionProc = null;
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    if (this.previewTimer) clearInterval(this.previewTimer);
    this.stopping = false;
  }

  grabPreview() {
    if (this.previewProc) return; // ainda rodando
    const chunks = [];
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', this.camera.rtsp,
      '-frames:v', '1',
      '-vf', 'scale=480:-1',
      '-q:v', '6',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1'
    ];
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    this.previewProc = p;
    p.stdout.on('data', (d) => chunks.push(d));
    p.on('exit', () => {
      this.previewProc = null;
      if (chunks.length) {
        const buf = Buffer.concat(chunks);
        this.onPreviewFrame?.(this.camera.id, 'data:image/jpeg;base64,' + buf.toString('base64'));
      }
    });
  }

  startMotion() {
    // Extrai frames somente quando cena muda >10% (detecção de movimento)
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', this.camera.rtsp,
      '-vf', "select='gt(scene,0.1)',scale=640:-1",
      '-vsync', 'vfr',
      '-q:v', '5',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      'pipe:1'
    ];
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    this.motionProc = p;
    let buffer = Buffer.alloc(0);
    p.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      // JPEGs começam com FFD8 e terminam com FFD9
      let start, end;
      while ((start = buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1 &&
             (end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start)) !== -1) {
        const jpg = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);
        this.onMotionSnapshot?.(this.camera, jpg);
      }
      if (buffer.length > 5_000_000) buffer = Buffer.alloc(0); // safety
    });
    p.on('exit', (code) => {
      this.motionProc = null;
      if (this.motionEnabled && !this.stopping && code !== 0) {
        setTimeout(() => this.motionEnabled && this.startMotion(), 5000);
      }
    });
  }

  rotate() {
    const cutoff = Date.now() - this.retentionDays * 86400_000;
    for (const f of fs.readdirSync(this.outputDir)) {
      const p = path.join(this.outputDir, f);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch {}
    }
  }

  snapshot() {
    return new Promise((resolve) => {
      const outFile = path.join(this.outputDir, `snap_${Date.now()}.jpg`);
      const args = ['-rtsp_transport','tcp','-i', this.camera.rtsp, '-frames:v','1','-q:v','3', outFile];
      const p = spawn(ffmpegPath, args);
      p.on('exit', () => resolve(fs.existsSync(outFile) ? outFile : null));
    });
  }
}

module.exports = Recorder;
