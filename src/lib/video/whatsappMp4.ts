import { toast } from 'sonner';

/**
 * Re-encodes a video blob using Canvas + MediaRecorder.
 * This avoids FFmpeg WASM which is too heavy/unreliable in browser.
 * Output is WebM (VP8/VP9) which is widely supported, or MP4 if browser supports it.
 */

function getSupportedMimeType(): string {
  const types = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

async function reEncodeVideo(inputBlob: Blob, keepAudio: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const blobUrl = URL.createObjectURL(inputBlob);
    video.src = blobUrl;

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
      video.remove();
      canvas.remove();
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    video.onloadedmetadata = () => {
      // Handle WebM duration bug
      if (!video.duration || !isFinite(video.duration)) {
        video.currentTime = 1e10;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          video.currentTime = 0;
          startRecording();
        };
      } else {
        startRecording();
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Erro ao carregar vídeo'));
    };

    function startRecording() {
      const w = video.videoWidth;
      const h = video.videoHeight;
      // Ensure even dimensions
      canvas.width = w % 2 === 0 ? w : w - 1;
      canvas.height = h % 2 === 0 ? h : h - 1;

      const stream = canvas.captureStream(30);

      // Add audio track if needed
      if (keepAudio && video.captureStream) {
        try {
          const videoStream = (video as any).captureStream();
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
          }
        } catch (e) {
          console.warn('[mp4] Could not capture audio track:', e);
        }
      }

      const mimeType = getSupportedMimeType();
      console.log('[mp4] Using mime type:', mimeType);

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 4_000_000,
        });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();
        const outputType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
        const result = new Blob(chunks, { type: outputType });
        resolve(result);
      };

      recorder.onerror = () => {
        cleanup();
        reject(new Error('Erro no MediaRecorder'));
      };

      // Safety timeout
      const maxDuration = Math.max((video.duration || 30) * 1000 + 5000, 60000);
      const safetyTimer = setTimeout(() => {
        try { recorder.stop(); } catch {}
        try { video.pause(); } catch {}
      }, maxDuration);

      recorder.start(100);
      video.muted = !keepAudio;
      video.currentTime = 0;
      video.play().catch(() => {
        cleanup();
        clearTimeout(safetyTimer);
        reject(new Error('Não foi possível reproduzir o vídeo'));
      });

      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      requestAnimationFrame(drawFrame);

      video.onended = () => {
        // Draw last frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        clearTimeout(safetyTimer);
        setTimeout(() => {
          try { recorder.stop(); } catch {}
        }, 200);
      };
    }

    video.load();
  });
}

function getFileExtension(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) return '.mp4';
  return '.webm';
}

/* ── public API ── */

export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  const tid = toast.loading('Convertendo vídeo com áudio...');
  try {
    const result = await reEncodeVideo(inputBlob, true);
    toast.success('Vídeo com áudio pronto!', { id: tid });
    return result;
  } catch (err) {
    console.error('[mp4] convert error:', err);
    toast.error('Falha na conversão. Baixando original...', { id: tid });
    // Fallback: return original blob
    return inputBlob;
  }
}

export async function removeAudioFromVideo(inputBlob: Blob): Promise<Blob> {
  const tid = toast.loading('Gerando vídeo sem áudio...');
  try {
    const result = await reEncodeVideo(inputBlob, false);
    toast.success('Vídeo sem áudio pronto!', { id: tid });
    return result;
  } catch (err) {
    console.error('[mp4] remove audio error:', err);
    toast.error('Falha na conversão. Baixando original...', { id: tid });
    return inputBlob;
  }
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return convertVideoToWhatsappMp4(blob);
}

export function triggerDownload(blob: Blob, fileName: string) {
  const ext = getFileExtension(blob.type);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Use correct extension based on actual output format
  const baseName = fileName.replace(/\.\w+$/, '');
  a.download = baseName + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
