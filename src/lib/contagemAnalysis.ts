import { supabase } from "@/integrations/supabase/client";

const DEFAULT_MAX_IMAGE_SIZE = 1800;
const DEFAULT_IMAGE_QUALITY = 0.9;
const DETAIL_TILE_MAX_SIZE = 1200;
const DETAIL_TILE_QUALITY = 0.88;
const TILE_OVERLAP_RATIO = 0.12;

export interface ContagemDetection {
  id: number;
  label: string;
  confianca: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface ContagemAnalysisResult {
  total_detectado: number;
  confianca_media: number | null;
  deteccoes: ContagemDetection[];
  observacao_ia?: string | null;
}

interface DetailImagePayload {
  label: string;
  imageBase64: string;
}

interface AnalyzeContagemImageParams {
  imageDataUrl: string;
  tipoObjeto: string;
  quantidadeEsperada?: number | null;
  observacoes?: string | null;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });

async function renderRegionToDataUrl({
  source,
  x,
  y,
  width,
  height,
  maxSize,
  quality,
}: {
  source: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  maxSize: number;
  quality: number;
}) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, x, y, width, height, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", quality);
}

function buildTileRegions(width: number, height: number) {
  const overlapX = Math.round(width * TILE_OVERLAP_RATIO);
  const overlapY = Math.round(height * TILE_OVERLAP_RATIO);
  const midX = Math.round(width / 2);
  const midY = Math.round(height / 2);

  const leftWidth = Math.min(width, midX + overlapX);
  const topHeight = Math.min(height, midY + overlapY);
  const rightX = Math.max(0, midX - overlapX);
  const bottomY = Math.max(0, midY - overlapY);

  return [
    { label: "quadrante superior esquerdo", x: 0, y: 0, width: leftWidth, height: topHeight },
    { label: "quadrante superior direito", x: rightX, y: 0, width: Math.max(1, width - rightX), height: topHeight },
    { label: "quadrante inferior esquerdo", x: 0, y: bottomY, width: leftWidth, height: Math.max(1, height - bottomY) },
    { label: "quadrante inferior direito", x: rightX, y: bottomY, width: Math.max(1, width - rightX), height: Math.max(1, height - bottomY) },
  ];
}

export async function resizeContagemImage(dataUrl: string, maxSize = DEFAULT_MAX_IMAGE_SIZE) {
  const image = await loadImage(dataUrl);
  return renderRegionToDataUrl({
    source: image,
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
    maxSize,
    quality: DEFAULT_IMAGE_QUALITY,
  });
}

async function buildDetailImages(mainImageDataUrl: string): Promise<DetailImagePayload[]> {
  const image = await loadImage(mainImageDataUrl);
  const regions = buildTileRegions(image.naturalWidth, image.naturalHeight);

  return Promise.all(
    regions.map(async (region) => {
      const tileDataUrl = await renderRegionToDataUrl({
        source: image,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        maxSize: DETAIL_TILE_MAX_SIZE,
        quality: DETAIL_TILE_QUALITY,
      });

      return {
        label: region.label,
        imageBase64: tileDataUrl.split(",")[1],
      };
    }),
  );
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a imagem original");
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao preparar a imagem original"));
    reader.readAsDataURL(blob);
  });
}

export async function analyzeContagemImage({
  imageDataUrl,
  tipoObjeto,
  quantidadeEsperada,
  observacoes,
}: AnalyzeContagemImageParams): Promise<ContagemAnalysisResult> {
  const normalizedTipo = tipoObjeto.trim();
  if (!normalizedTipo) {
    throw new Error("Descreva o que deseja contar");
  }

  const mainImageDataUrl = await resizeContagemImage(imageDataUrl);
  const detailImages = await buildDetailImages(mainImageDataUrl);

  const { data, error } = await supabase.functions.invoke("analyze-image", {
    body: {
      imageBase64: mainImageDataUrl.split(",")[1],
      detailImages,
      tipoObjeto: normalizedTipo,
      quantidadeEsperada: quantidadeEsperada ?? null,
      observacoes: observacoes?.trim() || null,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;

    if (context instanceof Response) {
      const errorBody = await context.json().catch(() => null);
      throw new Error(errorBody?.error || error.message || "Erro ao analisar imagem");
    }

    throw new Error(error.message || "Erro ao analisar imagem");
  }

  if (!data) {
    throw new Error("IA não retornou um resultado válido");
  }

  return data as ContagemAnalysisResult;
}
