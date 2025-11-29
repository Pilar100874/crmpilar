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

  // 2.1 Verifica também o estabelecimentoId (usado em outras partes do sistema)
  const storedEstabelecimentoId = localStorage.getItem('estabelecimentoId');
  if (storedEstabelecimentoId) {
    return storedEstabelecimentoId;
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

/**
 * Verifica se o usuário atual é um administrador do sistema (tabela administradores).
 * 
 * @returns true se for administrador do sistema, false caso contrário
 */
export async function isSystemAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: adminData } = await supabase
      .from('administradores')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    return !!adminData;
  } catch (error) {
    console.error('Erro ao verificar admin do sistema:', error);
    return false;
  }
}

/**
 * Verifica se o usuário atual é um admin do estabelecimento (role admin na tabela user_roles).
 * 
 * IMPORTANTE: Esta função verifica através da tabela usuarios + user_roles.
 * A tabela user_roles.user_id referencia usuarios.id, não auth.users.id.
 * 
 * @returns true se tiver role admin, false caso contrário
 */
export async function isEstabelecimentoAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Primeiro buscar o registro em usuarios para pegar o ID correto
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userData) return false;

    // Agora buscar a role usando usuarios.id
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.id)
      .eq('role', 'admin')
      .maybeSingle();

    return !!roleData;
  } catch (error) {
    console.error('Erro ao verificar admin do estabelecimento:', error);
    return false;
  }
}

/**
 * Verifica se o usuário tem qualquer tipo de permissão de admin
 * (administrador do sistema OU admin do estabelecimento).
 * 
 * @returns true se for admin de qualquer tipo, false caso contrário
 */
export async function isAnyAdmin(): Promise<boolean> {
  const [systemAdmin, estabelecimentoAdmin] = await Promise.all([
    isSystemAdmin(),
    isEstabelecimentoAdmin()
  ]);
  
  return systemAdmin || estabelecimentoAdmin;
}

/**
 * Obtém o ID do usuário na tabela usuarios a partir do auth.users.id
 * 
 * @returns O ID do registro em usuarios ou null se não encontrado
 */
export async function getUserIdFromAuth(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    return userData?.id || null;
  } catch (error) {
    console.error('Erro ao obter ID do usuário:', error);
    return null;
  }
}
