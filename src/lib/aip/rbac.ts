import { supabase } from "@/integrations/supabase/client";

/**
 * RBAC da Plataforma de Agentes IA.
 *
 * Lembrando a arquitetura do sistema: `user_roles.user_id` referencia
 * `usuarios.id` (e não `auth.users.id`). Por isso é preciso resolver
 * `auth.uid()` → `usuarios.id` antes de consultar as roles.
 */

export type AppRole = "admin" | "gestor" | "agente";

/** Roles autorizadas a ver e operar o Monitor do servidor. */
export const ROLES_MONITOR: AppRole[] = ["admin", "gestor"];

export interface AcessoAip {
  /** Existe sessão válida. */
  autenticado: boolean;
  /** Roles do usuário atual. */
  roles: AppRole[];
}

/** Busca as roles do usuário autenticado. */
export async function carregarAcessoAip(): Promise<AcessoAip> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return { autenticado: false, roles: [] };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario) return { autenticado: true, roles: [] };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", usuario.id);

  return {
    autenticado: true,
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}

/** true quando o usuário tem pelo menos uma das roles exigidas. */
export function temAlgumaRole(roles: AppRole[], exigidas: AppRole[]) {
  return roles.some((r) => exigidas.includes(r));
}
