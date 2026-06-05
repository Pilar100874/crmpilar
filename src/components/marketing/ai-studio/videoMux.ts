/**
 * Combina um vídeo (sem áudio ou com áudio que será substituído) com uma trilha
 * de áudio (ex.: TTS) num único MP4. Usa ffmpeg.wasm já carregado pelo
 * `videoConcat`. Ajusta a duração ao menor dos dois (-shortest).
 */
import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg, ConcatProgress } from './videoConcat';

export interface MuxProgress extends ConcatProgress {}

export async function muxAudioWithVideo(
  videoUrl: string,
  audioUrl: string,
  onProgress?: (p: MuxProgress) => void,
): Promise<Blob> {
  onProgress?.({ stage: 'loading', message: 'Preparando ferramentas de vídeo…' });
  const ff = await getFFmpeg(onProgress);

  onProgress?.({ stage: 'downloading', message: 'Baixando vídeo e áudio…' });
  const videoData = await fetchFile(videoUrl);
  const audioData = await fetchFile(audioUrl);

  await ff.writeFile('in.mp4', videoData);
  await ff.writeFile('in.mp3', audioData);

  onProgress?.({ stage: 'encoding', message: 'Combinando áudio e vídeo…' });
  // Substitui a trilha original do vídeo (se houver) pela narração.
  // -c:v copy mantém o vídeo intacto; -c:a aac re-encoda áudio para AAC.
  await ff.exec([
    '-y',
    '-i', 'in.mp4',
    '-i', 'in.mp3',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    'out.mp4',
  ]);

  const out = (await ff.readFile('out.mp4')) as Uint8Array;
  // Cleanup
  try { await ff.deleteFile('in.mp4'); } catch {}
  try { await ff.deleteFile('in.mp3'); } catch {}
  try { await ff.deleteFile('out.mp4'); } catch {}

  onProgress?.({ stage: 'done', message: 'Concluído.' });
  return new Blob([out.buffer as ArrayBuffer], { type: 'video/mp4' });
}
