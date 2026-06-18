/**
 * Normaliza uma imagem (File ou data/blob URL) para um quadrado de tamanho fixo (default 1024px),
 * fazendo "cover" (corta as bordas mantendo o centro), fundo branco e exporta como JPEG de boa qualidade.
 */
export async function normalizeImageToSquare(
  input: File | Blob | string,
  size = 1024,
  quality = 0.92,
): Promise<File> {
  const src = typeof input === "string" ? input : URL.createObjectURL(input);
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // cover: escala para preencher o quadrado e corta o excedente
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, w, h);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
        "image/jpeg",
        quality,
      ),
    );
    return new File([blob], `produto-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally {
    if (typeof input !== "string") URL.revokeObjectURL(src);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}

export function dataUrlToFile(dataUrl: string, filename = `img-${Date.now()}.png`): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}
