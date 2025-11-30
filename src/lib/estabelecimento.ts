import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o ID do estabelecimento do usuário atual
 * Primeiro verifica no localStorage, depois busca no banco
 */
export async function getEstabelecimentoId(): Promise<string> {
  // Tentar obter do localStorage primeiro
  const cached = localStorage.getItem('estabelecimentoId');
  if (cached) {
    return cached;
  }

  // Buscar do banco
  const { data } = await supabase
    .from('estabelecimentos')
    .select('id')
    .limit(1)
    .single();

  if (data?.id) {
    localStorage.setItem('estabelecimentoId', data.id);
    return data.id;
  }

  throw new Error('Estabelecimento não encontrado');
}
