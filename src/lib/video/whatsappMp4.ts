import { toast } from 'sonner';

/**
 * Download direto do blob original — já é MP4 H.264 do servidor.
 * Sem re-processamento, sem conversão, sem abrir nova janela.
 */
export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  // O vídeo já vem do storage como MP4 H.264, basta garantir o MIME type
  return new Blob([inputBlob], { type: 'video/mp4' });
}

/**
 * Remove o áudio de um vídeo usando MediaRecorder nativo.
 * O resultado é webm (limitação do browser) mas funcional.
 * Para WhatsApp, usar a versão "com áudio" que mantém o MP4 original.
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
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Blob([blob], { type: 'video/mp4' });
}

/**
 * Trigger direct download of a blob as .mp4
 */
export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.\w+$/, '') + '.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stripAudioNative(inputBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(inputBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

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

    const timeout = setTimeout(() => {
      if (!stopped) {
        cleanup();
        reject(new Error('Timeout ao processar vídeo'));
      }
    }, 120_000);

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const stream = canvas.captureStream(30);

      // Use webm since browsers don't support mp4 in MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      } catch {
        recorder = new MediaRecorder(stream, { videoBitsPerSecond: 2_500_000 });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(timeout);
        cleanup();
        // Wrap as mp4 mime for download naming, content is webm but plays fine
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

      video.play().then(drawFrame).catch((err) => {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Erro ao carregar vídeo'));
    };

    video.src = videoUrl;
  });
}
