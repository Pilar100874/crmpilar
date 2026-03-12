import { toast } from 'sonner';
import { FFmpeg } from '@ffmpeg/ffmpeg';

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  const buf = await response.arrayBuffer();
  const blob = new Blob([buf], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function fetchFile(input: Blob | string): Promise<Uint8Array> {
  if (input instanceof Blob) {
    const buf = await input.arrayBuffer();
    return new Uint8Array(buf);
  }
  const response = await fetch(input);
  const buf = await response.arrayBuffer();
  return new Uint8Array(buf);
}

const FFMPEG_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
const FFMPEG_LOAD_TIMEOUT_MS = 45_000;
const FFMPEG_EXEC_TIMEOUT_MS = 120_000;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let transcodeQueue: Promise<void> = Promise.resolve();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

function runQueued<T>(job: () => Promise<T>): Promise<T> {
  const run = transcodeQueue.then(job, job);
  transcodeQueue = run.then(() => undefined, () => undefined);
  return run;
}

function resetFfmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // noop
    }
  }

  ffmpegInstance = null;
  ffmpegLoadPromise = null;
}

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    try {
      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
        toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.worker.js`, 'text/javascript'),
      ]);

      await withTimeout(
        ffmpeg.load({ coreURL, wasmURL, workerURL }),
        FFMPEG_LOAD_TIMEOUT_MS,
        'Timeout ao carregar o conversor de vídeo.'
      );

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      try {
        ffmpeg.terminate();
      } catch {
        // noop
      }
      ffmpegLoadPromise = null;
      throw error;
    }
  })();

  return ffmpegLoadPromise;
}

async function transcodeToWhatsappMp4(inputBlob: Blob, keepAudio: boolean): Promise<Blob> {
  return runQueued(async () => {
    const ffmpeg = await getFfmpeg();
    const inputExt = inputBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const uniqueId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const inputName = `input-${uniqueId}.${inputExt}`;
    const outputName = `output-${uniqueId}.mp4`;

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

      const baseArgs = [
        '-hide_banner',
        '-i', inputName,
        '-map', '0:v:0',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=w=1280:h=-2:force_original_aspect_ratio=decrease,format=yuv420p',
        '-movflags', '+faststart',
        '-r', '30',
        '-crf', '28',
        '-threads', '1',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
      ];

      const args = keepAudio
        ? [
            ...baseArgs,
            '-map', '0:a:0?',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-ac', '2',
            '-y',
            outputName,
          ]
        : [
            ...baseArgs,
            '-an',
            '-y',
            outputName,
          ];

      const exitCode = await withTimeout(
        ffmpeg.exec(args),
        FFMPEG_EXEC_TIMEOUT_MS,
        'A conversão demorou demais e foi interrompida.'
      );

      if (exitCode !== 0) {
        throw new Error(`Falha na conversão (código ${exitCode}).`);
      }

      const outputData = await ffmpeg.readFile(outputName);
      if (typeof outputData === 'string') {
        throw new Error('Saída inválida do conversor de vídeo.');
      }

      return new Blob([new Uint8Array(outputData)], { type: 'video/mp4' });
    } catch (error) {
      resetFfmpeg();
      throw error;
    } finally {
      try {
        await ffmpeg.deleteFile(inputName);
      } catch {
        // noop
      }
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {
        // noop
      }
    }
  });
}

export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Convertendo para MP4 compatível com WhatsApp...');
  try {
    const result = await transcodeToWhatsappMp4(inputBlob, true);
    toast.success('Vídeo pronto para WhatsApp!', { id: loadingId });
    return result;
  } catch (err) {
    console.error('[whatsappMp4] conversion error:', err);
    toast.error('Falha na conversão para WhatsApp. Tente um vídeo menor.', { id: loadingId });
    throw err;
  }
}

export async function removeAudioFromVideo(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Gerando versão sem áudio...');
  try {
    const result = await transcodeToWhatsappMp4(inputBlob, false);
    toast.success('Vídeo sem áudio pronto!', { id: loadingId });
    return result;
  } catch (err) {
    console.error('[whatsappMp4] remove audio error:', err);
    toast.error('Falha ao remover áudio do vídeo.', { id: loadingId });
    throw err;
  }
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const response = await fetch(url);
  const blob = await response.blob();
  return convertVideoToWhatsappMp4(blob);
}
