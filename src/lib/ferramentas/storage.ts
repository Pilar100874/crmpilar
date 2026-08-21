import { supabase } from "@/integrations/supabase/client";

/** Buckets privados do módulo Ferramentas. */
export const FERR_BUCKET_TOOLS = "ferr-tool-photos";
export const FERR_BUCKET_LOANS = "ferr-loan-photos";

/** 10 anos em segundos — URL assinada de longa duração para exibição direta. */
const EXPIRA_EM = 60 * 60 * 24 * 365 * 10;

/** Tipos de imagem aceitos nos buckets privados. */
export const FERR_TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/** Tamanho máximo padrão de upload (MB). */
export const FERR_TAMANHO_MAX_MB = 10;

const EXT_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class FerrUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FerrUploadError";
  }
}

/**
 * Valida tipo e tamanho do arquivo antes de subir.
 * Lança FerrUploadError com mensagem amigável em português.
 */
export function validarFerrFoto(file: Blob, maxMB = FERR_TAMANHO_MAX_MB): string {
  const tipo = (file.type || "").toLowerCase();

  if (!tipo) {
    throw new FerrUploadError("Não foi possível identificar o tipo do arquivo. Selecione uma imagem JPG, PNG ou WEBP.");
  }
  if (!(FERR_TIPOS_PERMITIDOS as readonly string[]).includes(tipo)) {
    throw new FerrUploadError("Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.");
  }
  if (file.size === 0) {
    throw new FerrUploadError("O arquivo está vazio. Tire a foto novamente.");
  }
  if (file.size > maxMB * 1024 * 1024) {
    const tamanho = (file.size / (1024 * 1024)).toFixed(1);
    throw new FerrUploadError(`Imagem muito grande (${tamanho} MB). O limite é de ${maxMB} MB.`);
  }

  return tipo;
}

/** Garante que o caminho tenha a extensão correspondente ao tipo do arquivo. */
function ajustarExtensao(filePath: string, tipo: string) {
  const ext = EXT_POR_TIPO[tipo] ?? "jpg";
  return filePath.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
}

/**
 * Envia um arquivo para um bucket privado do módulo e devolve uma URL assinada
 * de longa duração, para que os componentes continuem exibindo por <img src>.
 */
export async function uploadFerrFoto(
  bucket: string,
  filePath: string,
  file: Blob,
  contentType?: string,
  maxMB = FERR_TAMANHO_MAX_MB,
): Promise<string> {
  const tipo = validarFerrFoto(
    contentType && !file.type ? new Blob([file], { type: contentType }) : file,
    maxMB,
  );
  const caminho = ajustarExtensao(filePath, tipo);

  const { error } = await supabase.storage.from(bucket).upload(caminho, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: tipo,
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("exceeded") || msg.includes("too large") || msg.includes("payload")) {
      throw new FerrUploadError(`Imagem acima do limite permitido (${maxMB} MB).`);
    }
    if (msg.includes("mime") || msg.includes("content type")) {
      throw new FerrUploadError("Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.");
    }
    if (msg.includes("row-level security") || msg.includes("unauthorized") || msg.includes("jwt")) {
      throw new FerrUploadError("Sessão expirada ou sem permissão para enviar fotos. Entre novamente e tente de novo.");
    }
    if (msg.includes("bucket not found")) {
      throw new FerrUploadError("Local de armazenamento das fotos indisponível. Avise o administrador.");
    }
    if (msg.includes("failed to fetch") || msg.includes("network")) {
      throw new FerrUploadError("Falha de conexão ao enviar a foto. Verifique a internet e tente novamente.");
    }
    throw new FerrUploadError(error.message || "Não foi possível enviar a foto.");
  }

  const { data, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(caminho, EXPIRA_EM);

  if (signedError || !data?.signedUrl) {
    throw new FerrUploadError(
      "A foto foi enviada, mas não foi possível gerar o link de exibição. Tente novamente.",
    );
  }

  return data.signedUrl;
}
