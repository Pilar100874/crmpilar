import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o estabelecimento_id para o contexto atual.
 * 
 * Prioridade:
 * 1. estabelecimentoId passado como parâmetro (prop)
 * 2. selectedEstabelecimentoId do localStorage (para administradores)
 * 3. estabelecimento_id do usuário na tabela usuarios
 * 
 * @param estabelecimentoId - ID do estabelecimento passado como prop (opcional)
 * @returns O ID do estabelecimento ou null se não encontrado
 */
export async function getEstabelecimentoId(estabelecimentoId?: string): Promise<string | null> {
  // 1. Se foi passado como parâmetro, usa ele
  if (estabelecimentoId) {
    return estabelecimentoId;
  }

  // 2. Verifica se há um estabelecimento selecionado no localStorage (para admins)
  const selectedEstabelecimentoId = localStorage.getItem('selectedEstabelecimentoId');
  if (selectedEstabelecimentoId) {
    return selectedEstabelecimentoId;
  }

  // 3. Busca o estabelecimento_id do usuário na tabela usuarios
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Verifica se é administrador
    const { data: adminData } = await supabase
      .from('administradores')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Se é administrador mas não selecionou estabelecimento, retorna null
    if (adminData) {
      return null;
    }

    // Se não é admin, busca na tabela usuarios
    const { data: userData } = await (supabase as any)
      .from('usuarios')
      .select('estabelecimento_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    return userData?.estabelecimento_id || null;
  } catch (error) {
    console.error('Erro ao obter estabelecimento_id:', error);
    return null;
  }
}
