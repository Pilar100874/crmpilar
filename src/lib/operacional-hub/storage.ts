import { supabase } from "@/integrations/supabase/client";

/** Buckets privados do Operacional Hub. */
export const OP_BUCKET_TASKS = "task-photos";
export const OP_BUCKET_LOCATION = "task-location-photos";
export const OP_BUCKET_IRREGULARITIES = "irregularity-photos";

/** 10 anos — URL assinada de longa duração para exibição direta em <img src>. */
const EXPIRA_EM = 60 * 60 * 24 * 365 * 10;

/**
 * Gera uma URL assinada de longa duração para um arquivo em bucket privado.
 * Lança erro se não for possível gerar o link.
 */
export async function opSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, EXPIRA_EM);
  if (error || !data?.signedUrl) {
    throw new Error("Arquivo enviado, mas não foi possível gerar o link de exibição.");
  }
  return data.signedUrl;
}

/** Faz o upload e já devolve a URL assinada de exibição. */
export async function opUploadFoto(
  bucket: string,
  path: string,
  file: Blob,
  contentType?: string,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    ...(contentType ? { contentType } : {}),
  });
  if (error) throw error;
  return opSignedUrl(bucket, path);
}
