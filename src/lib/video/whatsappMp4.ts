import { toast } from 'sonner';

/**
 * Re-record a video blob using native browser APIs (canvas + MediaRecorder).
 * When keepAudio=true, the audio track from the original video is included.
 * When keepAudio=false, only the video (canvas) stream is recorded.
 * Returns a proper video/webm or video/mp4 blob.
 */
function reRecordVideo(inputBlob: Blob, keepAudio: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(inputBlob);
    const video = document.createElement('video');
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    // Must NOT be muted if we want to capture audio
    video.muted = !keepAudio;

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

      // Canvas stream (video track)
      const canvasStream = canvas.captureStream(30);

      // Build combined stream
      let combinedStream: MediaStream;
      if (keepAudio) {
        // Try to get audio from the video element
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination); // So video plays audibly during recording

          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        } catch (e) {
          console.warn('[reRecordVideo] Could not capture audio, falling back to video only:', e);
          combinedStream = canvasStream;
        }
      } else {
        combinedStream = canvasStream;
      }

      // Pick best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
        ? 'video/webm; codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')
          ? 'video/webm; codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/webm';

      try {
        recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 2_500_000,
        });
      } catch {
        recorder = new MediaRecorder(combinedStream, {
          videoBitsPerSecond: 2_500_000,
        });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(timeout);
        cleanup();
        // Use the actual mimeType from recorder
        const actualType = recorder?.mimeType || 'video/webm';
        const finalBlob = new Blob(chunks, { type: actualType });
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

/**
 * Helper: trigger a direct download of a blob as .mp4
 */
function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.mp4') ? fileName : fileName.replace(/\.\w+$/, '.mp4');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Remove audio from a video blob.
 */
export async function removeAudioFromVideo(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Removendo áudio do vídeo...');
  try {
    const result = await reRecordVideo(inputBlob, false);
    toast.success('Vídeo sem áudio pronto!', { id: loadingId });
    return result;
  } catch (err) {
    console.error('[removeAudio] error:', err);
    toast.error('Falha ao remover áudio. Baixando original.', { id: loadingId });
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

/**
 * Convert/re-record video with audio preserved.
 */
export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Preparando vídeo com áudio...');
  try {
    const result = await reRecordVideo(inputBlob, true);
    toast.success('Vídeo com áudio pronto!', { id: loadingId });
    return result;
  } catch (err) {
    console.error('[convertVideo] error:', err);
    toast.dismiss(loadingId);
    // Fallback: return original blob
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return convertVideoToWhatsappMp4(blob);
}

export { triggerDownload };
