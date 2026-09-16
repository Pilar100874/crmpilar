import { supabase } from "@/integrations/supabase/client";

/**
 * Leituras públicas da loja. Usam funções do servidor escopadas por empresa,
 * evitando que visitantes consigam ler dados de outras empresas.
 */

export async function carregarConfigLoja(estabelecimentoId?: string | null): Promise<any | null> {
  const { data } = await supabase.rpc("loja_config_publica" as any, {
    p_estabelecimento_id: estabelecimentoId || null,
  });
  const linhas = (data as any[]) || [];
  return linhas[0] || null;
}

export async function carregarAnunciosLoja(estabelecimentoId: string, posicao?: string | null): Promise<any[]> {
  if (!estabelecimentoId) return [];
  const { data } = await supabase.rpc("loja_anuncios_publicos" as any, {
    p_estabelecimento_id: estabelecimentoId,
    p_posicao: posicao || null,
  });
  return ((data as any[]) || []);
}

export async function carregarConteudoLoja(estabelecimentoId: string, tipo: string): Promise<any | null> {
  if (!estabelecimentoId) return null;
  const { data } = await supabase.rpc("loja_conteudo_publico" as any, {
    p_estabelecimento_id: estabelecimentoId,
    p_tipo: tipo,
  });
  const linhas = (data as any[]) || [];
  return linhas[0] || null;
}

export async function carregarVolumePricingLoja(estabelecimentoId: string): Promise<any[]> {
  if (!estabelecimentoId) return [];
  const { data } = await supabase.rpc("loja_volume_pricing_publico" as any, {
    p_estabelecimento_id: estabelecimentoId,
  });
  return ((data as any[]) || []);
}

export async function carregarApresentacaoTv(id: string): Promise<any | null> {
  if (!id) return null;
  const { data } = await supabase.rpc("apresentacao_tv_publica" as any, { p_id: id });
  const linhas = (data as any[]) || [];
  return linhas[0] || null;
}
