import { supabase } from "@/integrations/supabase/client";

export interface UsuarioGerente {
  id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  tipo?: string;
}

/**
 * Administradores também são gerentes para fins de vínculos e distribuição.
 * Considera tanto o perfil do grupo quanto a função administrativa do usuário.
 */
export async function carregarGerentesEAdministradores(
  estabelecimentoId: string,
): Promise<UsuarioGerente[]> {
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, whatsapp, tipo, auth_user_id, grupos_acesso(perfil)")
    .eq("estabelecimento_id", estabelecimentoId)
    .order("nome");

  if (error) throw error;

  const ids = (usuarios || []).flatMap((usuario: any) => [usuario.id, usuario.auth_user_id].filter(Boolean));
  const administradoresPorFuncao = new Set<string>();

  if (ids.length > 0) {
    const { data: funcoes, error: funcoesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("user_id", ids)
      .eq("role", "admin");

    if (funcoesError) throw funcoesError;
    (funcoes || []).forEach((funcao) => administradoresPorFuncao.add(funcao.user_id));
  }

  return (usuarios || [])
    .filter((usuario) => {
      const grupo = Array.isArray(usuario.grupos_acesso)
        ? usuario.grupos_acesso[0]
        : usuario.grupos_acesso;
      const perfil = grupo?.perfil;
      return usuario.tipo === "gerente"
        || perfil === "gerente"
        || perfil === "admin"
        || administradoresPorFuncao.has(usuario.id)
        || (!!(usuario as any).auth_user_id && administradoresPorFuncao.has((usuario as any).auth_user_id));
    })
    .map(({ id, nome, email, whatsapp }) => ({ id, nome, email, whatsapp, tipo: "gerente" }));
}