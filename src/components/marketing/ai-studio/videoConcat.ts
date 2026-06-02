/**
 * Concatena múltiplos vídeos (URLs) em um único MP4 usando ffmpeg.wasm no browser.
 * Faz re-encode (não copy) para tolerar diferenças de codec/resolução/fps entre cenas.
 * Suporta transições suaves (xfade) entre cenas.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Tentativa de carregar bundle local (Vite serve). Se falhar, usamos CDNs.
async function tryLoadLocalUrls(): Promise<{ coreURL: string; wasmURL: string } | null> {
  try {
    const [coreMod, wasmMod] = await Promise.all([
      // @ts-ignore
      import('@ffmpeg/core/dist/umd/ffmpeg-core.js?url'),
      // @ts-ignore
      import('@ffmpeg/core/dist/umd/ffmpeg-core.wasm?url'),
    ]);
    return { coreURL: (coreMod as any).default, wasmURL: (wasmMod as any).default };
  } catch (err) {
    console.warn('[videoConcat] Bundle local ffmpeg indisponível:', err);
    return null;
  }
}

let _ffmpegInstance: FFmpeg | null = null;
let _loadingPromise: Promise<FFmpeg> | null = null;

const CDN_BASES = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
  'https://fastly.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
];

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Timeout (${ms / 1000}s) ao carregar ${label}. Verifique sua conexão ou bloqueador de scripts.`)), ms)),
  ]);
}

async function loadLocal(onProgress?: (p: ConcatProgress) => void): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  onProgress?.({ stage: 'loading', message: 'Preparando ferramentas de vídeo (local)…' });
  // Converte para blob URL para satisfazer requisito same-origin do worker
  const coreURL = await withTimeout(toBlobURL(localCoreURL as string, 'text/javascript'), 30000, 'componentes de vídeo locais');
  const wasmURL = await withTimeout(toBlobURL(localWasmURL as string, 'application/wasm'), 60000, 'componentes de vídeo locais');
  await withTimeout(ffmpeg.load({ coreURL, wasmURL }), 30000, 'componentes de vídeo locais');
  return ffmpeg;
}

async function loadFromBase(baseURL: string, onProgress?: (p: ConcatProgress) => void): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  onProgress?.({ stage: 'loading', message: 'Preparando ferramentas de vídeo…' });
  const coreURL = await withTimeout(toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'), 30000, 'componentes de vídeo');
  const wasmURL = await withTimeout(toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'), 60000, 'componentes de vídeo');
  await withTimeout(ffmpeg.load({ coreURL, wasmURL }), 30000, 'componentes de vídeo');
  return ffmpeg;
}

async function getFFmpeg(onProgress?: (p: ConcatProgress) => void): Promise<FFmpeg> {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    // 1) Tenta local primeiro (Vite serve os arquivos do node_modules)
    try {
      const ff = await loadLocal(onProgress);
      _ffmpegInstance = ff;
      return ff;
    } catch (err) {
      console.warn('[videoConcat] Falha ao carregar ffmpeg local, tentando CDNs:', err);
      onProgress?.({ stage: 'loading', message: 'Fallback para CDN…' });
    }
    // 2) Fallback para CDNs
    let lastErr: any;
    for (const base of CDN_BASES) {
      try {
        const ff = await loadFromBase(base, onProgress);
        _ffmpegInstance = ff;
        return ff;
      } catch (err) {
        lastErr = err;
        console.warn('[videoConcat] Falha em', base, err);
        onProgress?.({ stage: 'loading', message: 'Tentando outra fonte…' });
      }
    }
    _loadingPromise = null; // permite re-tentar depois
    throw new Error(`Não foi possível preparar as ferramentas de vídeo. ${lastErr?.message || ''}`);
  })();

  return _loadingPromise;
}


export interface ConcatProgress {
  stage: 'loading' | 'downloading' | 'encoding' | 'done';
  current?: number;
  total?: number;
  message?: string;
}

export type SceneTransition =
  | 'none'
  | 'fade'
  | 'fadeblack'
  | 'fadewhite'
  | 'dissolve'
  | 'wipeleft'
  | 'wiperight'
  | 'wipeup'
  | 'wipedown'
  | 'slideleft'
  | 'slideright'
  | 'slideup'
  | 'slidedown'
  | 'circleopen'
  | 'circleclose'
  | 'radial'
  | 'pixelize';

export interface ConcatOptions {
  transition?: SceneTransition;
  /** duração da transição em segundos (0.2 a 1.5 recomendado) */
  transitionDurationSec?: number;
  /** duração de cada cena (mesma ordem das urls). Necessário quando transition !== 'none'. */
  sceneDurationsSec?: number[];
}

/**
 * Baixa cada URL, re-encoda em parâmetros comuns (1280x720, 30fps, libx264 + aac),
 * concatena e retorna um Blob MP4 unificado. Opcionalmente aplica transições xfade.
 */
export async function concatVideos(
  urls: string[],
  onProgress?: (p: ConcatProgress) => void,
  options?: ConcatOptions,
): Promise<Blob> {
  if (!urls || urls.length === 0) throw new Error('Nenhum vídeo para unir.');
  if (urls.length === 1) {
    const res = await fetch(urls[0]);
    return await res.blob();
  }

  onProgress?.({ stage: 'loading', message: 'Preparando ferramentas de vídeo…' });
  const ffmpeg = await getFFmpeg(onProgress);

  // 1) Baixar
  for (let i = 0; i < urls.length; i++) {
    onProgress?.({ stage: 'downloading', current: i + 1, total: urls.length, message: `Baixando cena ${i + 1}/${urls.length}…` });
    const data = await fetchFile(urls[i]);
    await ffmpeg.writeFile(`in${i}.mp4`, data);
  }

  // 2) Normalizar (mesma resolução/fps/codec/áudio) — garante áudio mesmo se cena original for muda
  const normalizedFiles: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    onProgress?.({ stage: 'encoding', current: i + 1, total: urls.length, message: `Padronizando cena ${i + 1}/${urls.length}…` });
    const out = `norm${i}.mp4`;
    await ffmpeg.exec([
      '-i', `in${i}.mp4`,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-shortest',
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-map', '1:a:0',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-pix_fmt', 'yuv420p',
      out,
    ]);
    normalizedFiles.push(out);
    try { await ffmpeg.deleteFile(`in${i}.mp4`); } catch {}
  }

  const transition = options?.transition && options.transition !== 'none' ? options.transition : null;
  const transitionDur = Math.min(1.5, Math.max(0.2, options?.transitionDurationSec ?? 0.5));
  const durations = options?.sceneDurationsSec;

  // 3a) Caminho com TRANSIÇÕES (xfade)
  if (transition && durations && durations.length === urls.length) {
    try {
      onProgress?.({ stage: 'encoding', message: `Aplicando transição "${transition}" entre cenas…` });

      const T = transitionDur;
      const videoChain: string[] = [];
      const audioChain: string[] = [];
      let cumDur = durations[0];
      let prevV = '[0:v]';
      let prevA = '[0:a]';

      for (let i = 1; i < normalizedFiles.length; i++) {
        const offset = Math.max(0, cumDur - T);
        const lastV = i === normalizedFiles.length - 1;
        const outV = lastV ? '[vout]' : `[v${i}x]`;
        const outA = lastV ? '[aout]' : `[a${i}x]`;
        videoChain.push(`${prevV}[${i}:v]xfade=transition=${transition}:duration=${T.toFixed(2)}:offset=${offset.toFixed(3)}${outV}`);
        audioChain.push(`${prevA}[${i}:a]acrossfade=d=${T.toFixed(2)}:c1=tri:c2=tri${outA}`);
        prevV = outV;
        prevA = outA;
        cumDur += durations[i] - T;
      }

      const filterComplex = [...videoChain, ...audioChain].join(';');
      const inputArgs = normalizedFiles.flatMap((f) => ['-i', f]);

      await ffmpeg.exec([
        ...inputArgs,
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4',
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const u8 = data as Uint8Array;
      const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: 'video/mp4' });

      for (const f of normalizedFiles) { try { await ffmpeg.deleteFile(f); } catch {} }
      try { await ffmpeg.deleteFile('output.mp4'); } catch {}

      onProgress?.({ stage: 'done', message: 'Vídeo unificado pronto com transições!' });
      return blob;
    } catch (xfadeErr: any) {
      console.warn('[videoConcat] Falha ao aplicar transições, caindo para concat simples:', xfadeErr);
      onProgress?.({ stage: 'encoding', message: 'Transição indisponível, unindo cenas de forma simples…' });
      // Continua para o caminho 3b
    }
  }

  // 3b) Concat simples via demuxer (sem transição)
  const listContent = normalizedFiles.map((f) => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(listContent));

  onProgress?.({ stage: 'encoding', message: 'Unindo cenas em vídeo único…' });
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    'output.mp4',
  ]);

  const data = await ffmpeg.readFile('output.mp4');
  const u8 = data as Uint8Array;
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: 'video/mp4' });

  for (const f of normalizedFiles) { try { await ffmpeg.deleteFile(f); } catch {} }
  try { await ffmpeg.deleteFile('concat.txt'); } catch {}
  try { await ffmpeg.deleteFile('output.mp4'); } catch {}

  onProgress?.({ stage: 'done', message: 'Vídeo unificado pronto!' });
  return blob;
}

/**
 * Faz upload do blob unificado para storage e retorna URL pública.
 */
export async function uploadConcatVideo(
  blob: Blob,
  estabelecimentoId: string,
  supabase: any,
): Promise<string> {
  const fileName = `studio-roteiro-${Date.now()}.mp4`;
  const storagePath = `${estabelecimentoId || 'anon'}/${fileName}`;
  const { error } = await supabase.storage
    .from('marketing-videos')
    .upload(storagePath, blob, { contentType: 'video/mp4', upsert: false });
  if (error) throw new Error(`Falha ao salvar vídeo unificado: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from('marketing-videos')
    .getPublicUrl(storagePath);
  return publicUrl;
}
