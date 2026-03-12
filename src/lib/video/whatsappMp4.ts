import { toast } from 'sonner';
import { FFmpeg } from '@ffmpeg/ffmpeg';

/* ── helpers (inline, sem @ffmpeg/util) ── */

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mimeType }));
}

async function fetchFile(input: Blob | string): Promise<Uint8Array> {
  if (input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  const resp = await fetch(input);
  return new Uint8Array(await resp.arrayBuffer());
}

/* ── FFmpeg singleton ── */

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
const LOAD_TIMEOUT = 60_000;
const EXEC_TIMEOUT = 180_000;

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let queue: Promise<void> = Promise.resolve();

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout>;
  const tp = new Promise<T>((_, rej) => { tid = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([p, tp]).finally(() => clearTimeout(tid!)) as Promise<T>;
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.then(() => {}, () => {});
  return run;
}

function reset() {
  try { instance?.terminate(); } catch {}
  instance = null;
  loadPromise = null;
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
    });
    try {
      const [coreURL, wasmURL, workerURL] = await Promise.all([
        toBlobURL(`${CORE_URL}/ffmpeg-core.js`, 'text/javascript'),
        toBlobURL(`${CORE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
        toBlobURL(`${CORE_URL}/ffmpeg-core.worker.js`, 'text/javascript'),
      ]);
      await withTimeout(ff.load({ coreURL, wasmURL, workerURL }), LOAD_TIMEOUT, 'Timeout carregando FFmpeg');
      instance = ff;
      return ff;
    } catch (e) {
      try { ff.terminate(); } catch {}
      loadPromise = null;
      throw e;
    }
  })();

  return loadPromise;
}

/* ── transcode core ── */

async function transcode(inputBlob: Blob, keepAudio: boolean): Promise<Blob> {
  return enqueue(async () => {
    const ff = await getFFmpeg();
    const ext = inputBlob.type.includes('webm') ? 'webm' : 'mp4';
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inFile = `in_${uid}.${ext}`;
    const outFile = `out_${uid}.mp4`;

    try {
      const data = await fetchFile(inputBlob);
      await ff.writeFile(inFile, data);

      const args: string[] = [
        '-i', inFile,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-r', '30',
        '-crf', '28',
        '-threads', '1',
      ];

      if (keepAudio) {
        args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
      } else {
        args.push('-an');
      }

      args.push('-y', outFile);

      const code = await withTimeout(ff.exec(args), EXEC_TIMEOUT, 'Conversão demorou demais');
      if (code !== 0) throw new Error(`FFmpeg retornou código ${code}`);

      const out = await ff.readFile(outFile);
      if (typeof out === 'string') throw new Error('Saída inválida');

      return new Blob([new Uint8Array(out)], { type: 'video/mp4' });
    } catch (e) {
      reset();
      throw e;
    } finally {
      try { await ff.deleteFile(inFile); } catch {}
      try { await ff.deleteFile(outFile); } catch {}
    }
  });
}

/* ── public API ── */

export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  // Se já for MP4 nativo (ftyp header), retorna direto sem conversão
  if (await isMp4Native(inputBlob)) {
    return new Blob([inputBlob], { type: 'video/mp4' });
  }

  const tid = toast.loading('Convertendo para MP4 com áudio...');
  try {
    const result = await transcode(inputBlob, true);
    toast.success('Vídeo MP4 com áudio pronto!', { id: tid });
    return result;
  } catch (err) {
    console.error('[whatsappMp4] convert error:', err);
    toast.error('Falha na conversão. Baixando original.', { id: tid });
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

export async function removeAudioFromVideo(inputBlob: Blob): Promise<Blob> {
  const tid = toast.loading('Gerando MP4 sem áudio...');
  try {
    const result = await transcode(inputBlob, false);
    toast.success('Vídeo MP4 sem áudio pronto!', { id: tid });
    return result;
  } catch (err) {
    console.error('[whatsappMp4] remove audio error:', err);
    toast.error('Falha ao remover áudio.', { id: tid });
    return new Blob([inputBlob], { type: 'video/mp4' });
  }
}

export async function downloadAsWhatsappMp4(url: string): Promise<Blob> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return convertVideoToWhatsappMp4(blob);
}

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

/* ── util: detect native MP4 by checking ftyp box ── */

async function isMp4Native(blob: Blob): Promise<boolean> {
  try {
    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    // ftyp at bytes 4-7
    return header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70;
  } catch {
    return false;
  }
}
