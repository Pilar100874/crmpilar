import { Canvas as FabricCanvas } from "fabric";

export const exportCanvasToPNG = async (
  canvas: FabricCanvas,
  dpi: number = 300
): Promise<Blob> => {
  const scale = dpi / 96; // 96 é o DPI padrão do canvas
  
  // Render canvas to data URL first
  const dataUrl = canvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: scale,
  });

  // If there is a mask, apply it at export time
  const maskDataUrl = (window as any).__maskDataUrl || sessionStorage.getItem('currentMaskDataUrl');
  if (maskDataUrl) {
    const [img, mask] = await Promise.all([
      loadImageFromUrl(dataUrl),
      loadImageFromUrl(maskDataUrl),
    ]);

    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const octx = off.getContext('2d');
    if (!octx) {
      const response = await fetch(dataUrl);
      return await response.blob();
    }
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(mask, 0, 0, off.width, off.height);
    octx.globalCompositeOperation = 'source-over';

    return await new Promise<Blob>((resolve, reject) => {
      off.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Export mask failed'));
      }, 'image/png', 1);
    });
  }

  const response = await fetch(dataUrl);
  return await response.blob();
};

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export const exportCanvasToJSON = (canvas: FabricCanvas): string => {
  return JSON.stringify(canvas.toJSON());
};

export const loadCanvasFromJSON = async (
  canvas: FabricCanvas,
  json: string
): Promise<void> => {
  await canvas.loadFromJSON(JSON.parse(json));
  canvas.renderAll();
};
