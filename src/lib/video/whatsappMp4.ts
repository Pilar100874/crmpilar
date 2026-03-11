import { toast } from 'sonner';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

async function transcodeToWhatsappMp4(inputBlob: Blob, keepAudio: boolean): Promise<Blob> {
  const ffmpeg = await getFfmpeg();
  const inputName = `input-${Date.now()}.webm`;
  const outputName = `output-${Date.now()}.mp4`;

  await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

  const baseArgs = [
    '-i', inputName,
    '-map', '0:v:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-profile:v', 'baseline',
    '-level', '3.1',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-r', '30',
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

  await ffmpeg.exec(args);

  const outputData = await ffmpeg.readFile(outputName);
  let blobPart: BlobPart;

  if (typeof outputData === 'string') {
    blobPart = new TextEncoder().encode(outputData);
  } else {
    blobPart = outputData.buffer.slice(
      outputData.byteOffset,
      outputData.byteOffset + outputData.byteLength,
    );
  }

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // noop cleanup
  }

  return new Blob([blobPart], { type: 'video/mp4' });
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
