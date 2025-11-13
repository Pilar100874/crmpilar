import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o estabelecimento_id do perfil do usuário autenticado.
 * Usa apenas Supabase Auth e a tabela profiles.
 * 
 * Para administradores, verifica se há um estabelecimento selecionado no sessionStorage.
 * Se não houver, retorna null (admin pode ver tudo).
 * 
 * @returns O ID do estabelecimento ou null se não encontrado
 */
export async function getEstabelecimentoId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Busca o perfil do usuário na tabela profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('estabelecimento_id, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    // Se for admin e tiver estabelecimento selecionado no sessionStorage, usa ele
    if (profile?.is_admin) {
      const selectedEstab = sessionStorage.getItem('selectedEstabelecimentoId');
      if (selectedEstab) {
        return selectedEstab;
      }
      // Admin sem estabelecimento selecionado: retorna null para ver tudo
      return null;
    }

    return profile?.estabelecimento_id || null;
  } catch (error) {
    console.error('Erro ao obter estabelecimento_id:', error);
    return null;
  }
}

/**
 * Verifica se o usuário atual é administrador
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    return profile?.is_admin || false;
  } catch (error) {
    console.error('Erro ao verificar se é admin:', error);
    return false;
  }
}

/**
 * Obtém o perfil completo do usuário
 */
export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return profile;
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    return null;
  }
}

/**
 * Atualiza o estabelecimento do usuário (apenas para admins)
 */
export async function updateUserEstabelecimento(estabelecimentoId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Verifica se é admin
    const admin = await isUserAdmin();
    if (!admin) {
      console.error('Apenas administradores podem mudar de estabelecimento');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ estabelecimento_id: estabelecimentoId })
      .eq('id', user.id);

    if (error) {
      console.error('Erro ao atualizar estabelecimento:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar estabelecimento:', error);
    return false;
  }
}
