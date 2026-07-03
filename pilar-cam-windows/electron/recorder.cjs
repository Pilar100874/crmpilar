const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

class Recorder {
  constructor({ camera, outputDir, retentionDays, motionEnabled, onEvent }) {
    this.camera = camera;
    this.outputDir = outputDir;
    this.retentionDays = retentionDays;
    this.motionEnabled = motionEnabled;
    this.onEvent = onEvent;
    this.proc = null;
    this.rotateTimer = null;
    fs.mkdirSync(outputDir, { recursive: true });
  }

  start() {
    this.stop();
    const outPattern = path.join(this.outputDir, 'seg_%Y-%m-%d_%H-%M-%S.mp4');
    // Grava segmentos de 10 min em MP4, copia stream (sem re-encode = baixo CPU)
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
      console.log(`[${this.camera.nome}] ffmpeg exit`, code);
      if (code !== 0) setTimeout(() => this.start(), 5000);
    });
    this.rotateTimer = setInterval(() => this.rotate(), 60 * 60 * 1000);
    this.rotate();
    this.onEvent?.({ type: 'recording_started', ts: Date.now() });
  }

  stop() {
    if (this.proc) { try { this.proc.kill('SIGTERM'); } catch {} this.proc = null; }
    if (this.rotateTimer) clearInterval(this.rotateTimer);
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
