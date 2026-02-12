import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Converts an array of base64 image URLs into an animated GIF data URL.
 */
export async function createAnimatedGif(
  frameUrls: string[],
  fps: number = 2,
  maxWidth: number = 512
): Promise<string> {
  if (!frameUrls.length) throw new Error('No frames provided');

  const delay = Math.round(1000 / fps);

  // Load all frames as ImageBitmap via canvas
  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const images = await Promise.all(frameUrls.map(loadImage));

  // Determine dimensions (scale down if needed, keep aspect ratio)
  const firstImg = images[0];
  let width = firstImg.naturalWidth;
  let height = firstImg.naturalHeight;
  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  // Ensure even dimensions
  width = width & ~1;
  height = height & ~1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const gif = GIFEncoder();

  for (let i = 0; i < images.length; i++) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(images[i], 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // Convert RGBA to RGB array for quantization
    const rgbaPixels = new Uint8Array(data.buffer);

    // Quantize to 256 colors
    const palette = quantize(rgbaPixels, 256, { format: 'rgba4444' });
    const index = applyPalette(rgbaPixels, palette, 'rgba4444');

    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0,
    });
  }

  gif.finish();

  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
