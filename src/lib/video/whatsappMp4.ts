import { toast } from 'sonner';

/**
 * Remove audio from a video blob using native browser APIs (canvas + MediaRecorder).
 * Returns a new Blob as video/mp4 (or webm depending on browser support).
 */
export async function removeAudioFromVideo(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Removendo áudio do vídeo...');
  try {
    const result = await stripAudioNative(inputBlob);
    toast.success('Vídeo sem áudio pronto!', { id: loadingId });
    return result;
  } catch (err) {
    console.error('[removeAudio] error:', err);
    toast.error('Falha ao remover áudio. Baixando original.', { id: loadingId });
    // Return original blob as fallback
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

/**
 * For "com áudio" downloads we just re-wrap the blob as video/mp4.
 * No transcoding needed for simple download.
 */
export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  return new Blob([inputBlob], { type: 'video/mp4' });
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Blob([blob], { type: 'video/mp4' });
}

function stripAudioNative(inputBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(inputBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    let recorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let stopped = false;

    const cleanup = () => {
      stopped = true;
      try { video.pause(); } catch {}
      try { video.src = ''; } catch {}
      URL.revokeObjectURL(videoUrl);
    };

    // Timeout safety
    const timeout = setTimeout(() => {
      if (!stopped) {
        cleanup();
        reject(new Error('Timeout ao processar vídeo'));
      }
    }, 60_000);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Get canvas stream (video only, no audio)
      const stream = canvas.captureStream(30);

      // Pick best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')
        ? 'video/mp4; codecs="avc1.42E01E"'
        : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm';

      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2_500_000,
        });
      } catch {
        recorder = new MediaRecorder(stream, {
          videoBitsPerSecond: 2_500_000,
        });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(timeout);
        cleanup();
        const finalBlob = new Blob(chunks, { type: 'video/mp4' });
        resolve(finalBlob);
      };

      recorder.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error('Erro no MediaRecorder'));
      };

      recorder.start(100);

      const drawFrame = () => {
        if (stopped || video.ended || video.paused) {
          if (recorder && recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        if (recorder && recorder.state === 'recording') {
          recorder.stop();
        }
      };

      video.play().then(drawFrame).catch(reject);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Erro ao carregar vídeo'));
    };

    video.src = videoUrl;
  });
}
