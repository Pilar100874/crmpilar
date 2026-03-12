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

type InputProbe = {
  ext: 'mp4' | 'webm' | 'mov' | 'ogg';
  formatArg?: 'webm' | 'mov' | 'ogg';
};

async function probeInput(blob: Blob): Promise<InputProbe> {
  try {
    const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());

    // WebM / Matroska (EBML)
    if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
      return { ext: 'webm', formatArg: 'webm' };
    }

    // ISO BMFF (MP4/MOV): "ftyp" em bytes 4..7
    if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
      const majorBrand = String.fromCharCode(header[8], header[9], header[10], header[11]);
      if (majorBrand === 'qt  ') return { ext: 'mov', formatArg: 'mov' };
      return { ext: 'mp4' };
    }

    // OGG
    if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
      return { ext: 'ogg', formatArg: 'ogg' };
    }
  } catch {
    // fallback abaixo
  }

  const mime = blob.type.toLowerCase();
  if (mime.includes('webm')) return { ext: 'webm', formatArg: 'webm' };
  if (mime.includes('quicktime') || mime.includes('mov')) return { ext: 'mov', formatArg: 'mov' };
  if (mime.includes('ogg')) return { ext: 'ogg', formatArg: 'ogg' };
  return { ext: 'mp4' };
}

/* ── FFmpeg singleton ── */

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
const LOAD_TIMEOUT = 60_000;
const EXEC_TIMEOUT = 240_000;

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let queue: Promise<void> = Promise.resolve();

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout>;
  const tp = new Promise<T>((_, rej) => {
    tid = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([p, tp]).finally(() => clearTimeout(tid!)) as Promise<T>;
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.then(() => {}, () => {});
  return run;
}

function reset() {
  try {
    instance?.terminate();
  } catch {}
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
      try {
        ff.terminate();
      } catch {}
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
    const probe = await probeInput(inputBlob);
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inFile = `in_${uid}.${probe.ext}`;
    const outFile = `out_${uid}.mp4`;

    try {
      const data = await fetchFile(inputBlob);
      await ff.writeFile(inFile, data);

      const args: string[] = ['-hide_banner', '-loglevel', 'error'];

      if (probe.formatArg) {
        args.push('-f', probe.formatArg);
      }

      args.push(
        '-i',
        inFile,
        '-map',
        '0:v:0',
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-profile:v',
        'baseline',
        '-level',
        '3.1',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-r',
        '30',
        '-crf',
        '23',
      );

      if (keepAudio) {
        args.push('-map', '0:a:0?', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
      } else {
        args.push('-an');
      }

      args.push('-max_muxing_queue_size', '1024', '-y', outFile);

      const code = await withTimeout(ff.exec(args), EXEC_TIMEOUT, 'Conversão demorou demais');
      if (code !== 0) throw new Error(`FFmpeg retornou código ${code}`);

      const out = await ff.readFile(outFile);
      if (typeof out === 'string') throw new Error('Saída inválida');

      return new Blob([new Uint8Array(out)], { type: 'video/mp4' });
    } catch (e) {
      reset();
      throw e;
    } finally {
      try {
        await ff.deleteFile(inFile);
      } catch {}
      try {
        await ff.deleteFile(outFile);
      } catch {}
    }
  });
}

/* ── public API ── */

export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  const tid = toast.loading('Convertendo para MP4 com áudio...');
  try {
    const result = await transcode(inputBlob, true);
    toast.success('Vídeo MP4 com áudio pronto!', { id: tid });
    return result;
  } catch (err) {
    console.error('[whatsappMp4] convert error:', err);
    toast.error('Falha na conversão para MP4 com áudio.', { id: tid });
    throw err instanceof Error ? err : new Error('Falha na conversão para MP4 com áudio');
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
    toast.error('Falha na conversão para MP4 sem áudio.', { id: tid });
    throw err instanceof Error ? err : new Error('Falha na conversão para MP4 sem áudio');
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
