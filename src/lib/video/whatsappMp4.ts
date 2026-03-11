import { toast } from 'sonner';

/**
 * Checks if a blob is already a valid MP4 file by inspecting its magic bytes.
 * MP4 files start with an 'ftyp' box (bytes 4-7 = 'ftyp').
 */
async function isMp4File(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false;
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  // Check for 'ftyp' at offset 4
  const ftyp = String.fromCharCode(header[4], header[5], header[6], header[7]);
  return ftyp === 'ftyp';
}

/**
 * Ensures a video blob is WhatsApp-compatible MP4 (H.264/AAC).
 * 
 * Strategy:
 * 1. If the blob is already a valid MP4 (magic bytes check), return as-is
 * 2. If it's WebM (from MediaRecorder), try re-encoding via Canvas+MediaRecorder with MP4 mime
 * 3. As fallback, return the blob with MP4 mime type and let WhatsApp handle it
 */
export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  // Step 1: Check if already valid MP4
  const alreadyMp4 = await isMp4File(inputBlob);
  if (alreadyMp4) {
    // Already a real MP4 file — just ensure correct MIME
    if (inputBlob.type === 'video/mp4') return inputBlob;
    return new Blob([inputBlob], { type: 'video/mp4' });
  }

  // Step 2: It's likely WebM from MediaRecorder — try to re-encode as MP4
  // Safari supports MediaRecorder with video/mp4, Chrome does not
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
    const loadingId = toast.loading('Convertendo vídeo para MP4 compatível com WhatsApp...');
    try {
      const result = await reEncodeToMp4(inputBlob);
      toast.success('Vídeo convertido para MP4!', { id: loadingId });
      return result;
    } catch (err) {
      console.warn('[whatsappMp4] Re-encode failed, using fallback:', err);
      toast.dismiss(loadingId);
    }
  }

  // Step 3: Fallback — wrap with MP4 mime type
  // This works for most AI-generated videos that are already H.264 but served with wrong mime
  console.warn('[whatsappMp4] Cannot re-encode to H.264 in this browser. Returning blob as-is with MP4 mime.');
  toast.info('⚠️ Este vídeo pode não ser compatível com WhatsApp. Vídeos do AI Studio já são MP4 compatíveis.');
  return new Blob([inputBlob], { type: 'video/mp4' });
}

/**
 * Re-encodes a video blob to MP4 using Canvas + MediaRecorder.
 * Only works in browsers that support MediaRecorder with video/mp4 (Safari).
 */
async function reEncodeToMp4(inputBlob: Blob): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(inputBlob);

    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(30);

      // Add audio if available
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch { /* no audio track */ }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/mp4',
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: 'video/mp4' }));
      };
      recorder.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('MediaRecorder error'));
      };

      recorder.start(100);
      await video.play();

      const draw = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };
      draw();

      video.onended = () => recorder.stop();
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Downloads a video from URL and ensures it's WhatsApp-compatible.
 * For direct downloads (not trimmed), most AI videos are already valid MP4.
 */
export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return convertVideoToWhatsappMp4(blob);
}
