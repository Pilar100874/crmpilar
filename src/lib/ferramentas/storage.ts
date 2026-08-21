import { supabase } from "@/integrations/supabase/client";

/** Buckets privados do módulo Ferramentas. */
export const FERR_BUCKET_TOOLS = "ferr-tool-photos";
export const FERR_BUCKET_LOANS = "ferr-loan-photos";

/** 10 anos em segundos — URL assinada de longa duração para exibição direta. */
const EXPIRA_EM = 60 * 60 * 24 * 365 * 10;

/**
 * Envia um arquivo para um bucket privado do módulo e devolve uma URL assinada
 * de longa duração, para que os componentes continuem exibindo por <img src>.
 */
export async function uploadFerrFoto(
  bucket: string,
  filePath: string,
  file: Blob,
  contentType = "image/jpeg",
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });
  if (error) throw error;

  const { data, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, EXPIRA_EM);
  if (signedError || !data?.signedUrl) throw signedError ?? new Error("Falha ao gerar URL da imagem");

  return data.signedUrl;
}
