import { toast } from 'sonner';

type FfmpegRuntime = {
  ffmpeg: {
    writeFile: (path: string, data: Uint8Array) => Promise<void>;
    exec: (args: string[]) => Promise<number>;
    readFile: (path: string) => Promise<Uint8Array | ArrayBuffer>;
    deleteFile: (path: string) => Promise<void>;
    loaded?: boolean;
    load: (config: { coreURL: string; wasmURL: string }) => Promise<void>;
  };
  fetchFile: (file: Blob | File | string | URL) => Promise<Uint8Array>;
  toBlobURL: (url: string, mimeType: string) => Promise<string>;
};

let runtimePromise: Promise<FfmpegRuntime> | null = null;

async function getRuntime(): Promise<FfmpegRuntime> {
  if (runtimePromise) return runtimePromise;

  runtimePromise = (async () => {
    const [{ FFmpeg }, ffUtil] = await Promise.all([
      import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10'),
      import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/util@0.12.1'),
    ]);

    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
      coreURL: await ffUtil.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await ffUtil.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return {
      ffmpeg,
      fetchFile: ffUtil.fetchFile,
      toBlobURL: ffUtil.toBlobURL,
    };
  })();

  return runtimePromise;
}

export async function convertVideoToWhatsappMp4(inputBlob: Blob): Promise<Blob> {
  const loadingId = toast.loading('Convertendo vídeo para MP4 compatível com WhatsApp...');

  try {
    const { ffmpeg, fetchFile } = await getRuntime();
    const inExt = inputBlob.type.includes('webm')
      ? 'webm'
      : inputBlob.type.includes('quicktime')
      ? 'mov'
      : inputBlob.type.includes('ogg')
      ? 'ogg'
      : 'mp4';

    const inputName = `input-${Date.now()}.${inExt}`;
    const outputName = `output-${Date.now()}.mp4`;

    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

    await ffmpeg.exec([
      '-i',
      inputName,
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
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputName,
    ]);

    const output = await ffmpeg.readFile(outputName);
    const outputBytes = output instanceof Uint8Array ? output : new Uint8Array(output);

    await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outputName)]);

    toast.success('Vídeo convertido com sucesso para WhatsApp!', { id: loadingId });
    return new Blob([outputBytes], { type: 'video/mp4' });
  } catch (error) {
    toast.error('Falha ao converter vídeo para WhatsApp.', { id: loadingId });
    throw error;
  }
}
