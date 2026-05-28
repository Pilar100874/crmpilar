/**
 * Concatena múltiplos vídeos (URLs) em um único MP4 usando ffmpeg.wasm no browser.
 * Faz re-encode (não copy) para tolerar diferenças de codec/resolução/fps entre cenas.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let _ffmpegInstance: FFmpeg | null = null;
let _loadingPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (_ffmpegInstance) return _ffmpegInstance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    _ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return _loadingPromise;
}

export interface ConcatProgress {
  stage: 'loading' | 'downloading' | 'encoding' | 'done';
  current?: number;
  total?: number;
  message?: string;
}

/**
 * Baixa cada URL, re-encoda em parâmetros comuns (1280x720, 30fps, libx264 + aac),
 * concatena e retorna um Blob MP4 unificado.
 */
export async function concatVideos(
  urls: string[],
  onProgress?: (p: ConcatProgress) => void,
): Promise<Blob> {
  if (!urls || urls.length === 0) throw new Error('Nenhum vídeo para unir.');
  if (urls.length === 1) {
    // Apenas um vídeo, retorna direto como blob
    const res = await fetch(urls[0]);
    return await res.blob();
  }

  onProgress?.({ stage: 'loading', message: 'Carregando ffmpeg…' });
  const ffmpeg = await getFFmpeg();

  // 1) Baixar e gravar cada vídeo no FS virtual
  for (let i = 0; i < urls.length; i++) {
    onProgress?.({ stage: 'downloading', current: i + 1, total: urls.length, message: `Baixando cena ${i + 1}/${urls.length}…` });
    const data = await fetchFile(urls[i]);
    await ffmpeg.writeFile(`in${i}.mp4`, data);
  }

  // 2) Normalizar cada vídeo (mesma resolução/fps/codec) para concat seguro
  const normalizedFiles: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    onProgress?.({ stage: 'encoding', current: i + 1, total: urls.length, message: `Padronizando cena ${i + 1}/${urls.length}…` });
    const out = `norm${i}.mp4`;
    await ffmpeg.exec([
      '-i', `in${i}.mp4`,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      out,
    ]);
    normalizedFiles.push(out);
    // Limpa o input bruto pra liberar memória
    try { await ffmpeg.deleteFile(`in${i}.mp4`); } catch {}
  }

  // 3) Concat via demuxer
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
  const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });

  // Limpeza
  for (const f of normalizedFiles) {
    try { await ffmpeg.deleteFile(f); } catch {}
  }
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
