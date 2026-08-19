/**
 * Resolve os usuários administradores/gestores de um estabelecimento.
 * A tabela `usuarios` não possui coluna `nivel_acesso`; as permissões ficam
 * em `user_roles` (user_id -> usuarios.id) e o campo `tipo` marca gerentes.
 */
export async function buscarAdminsEstabelecimento(
  admin: any,
  estabelecimentoId: string | null | undefined,
  incluirVendedores = false,
): Promise<{ id: string }[]> {
  if (!estabelecimentoId) return [];

  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, tipo, ativo")
    .eq("estabelecimento_id", estabelecimentoId);

  const ativos = (usuarios ?? []).filter((u: any) => u.ativo !== false);
  if (!ativos.length) return [];

  const ids = ativos.map((u: any) => u.id);
  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ids)
    .in("role", ["admin", "gestor"]);

  const comRole = new Set((roles ?? []).map((r: any) => r.user_id));

  let alvo = ativos.filter(
    (u: any) => comRole.has(u.id) || u.tipo === "gerente",
  );

  if (incluirVendedores && !alvo.length) alvo = ativos;

  return alvo.map((u: any) => ({ id: u.id }));
}
