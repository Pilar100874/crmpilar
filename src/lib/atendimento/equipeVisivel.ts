import { supabase } from "@/integrations/supabase/client";
import { carregarGerentesEAdministradores } from "@/lib/cadastros/gerentes";

export type PapelAtendimento = "admin" | "gerente" | "vendedor";

export interface MembroEquipe {
  id: string;
  nome: string;
  papel: "gerente" | "vendedor";
  /** Gerente ao qual o vendedor pertence (quando conhecido). */
  gerenteId?: string;
}

export interface EquipeVisivel {
  usuarioId: string;
  papel: PapelAtendimento;
  membros: MembroEquipe[];
}

/**
 * Regras de visibilidade na tela de Atendimento:
 * - Vendedor: somente o que está vinculado a ele.
 * - Gerente: o dele + vendedores vinculados a ele (tela de Gerentes).
 * - Admin: o dele + qualquer gerente e os vendedores desses gerentes.
 */
export async function carregarEquipeVisivel(estabelecimentoId: string): Promise<EquipeVisivel | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const { data: eu } = await supabase
    .from("usuarios")
    .select("id, tipo, grupos_acesso(perfil)")
    .eq("auth_user_id", auth.user.id)
    .eq("estabelecimento_id", estabelecimentoId)
    .maybeSingle();
  if (!eu) return null;

  const grupo: any = Array.isArray((eu as any).grupos_acesso) ? (eu as any).grupos_acesso[0] : (eu as any).grupos_acesso;
  const { data: roleAdmin } = await supabase
    .from("user_roles").select("user_id").eq("user_id", eu.id).eq("role", "admin").maybeSingle();

  const isAdmin = !!roleAdmin || grupo?.perfil === "admin";
  const isGerente = !isAdmin && (eu.tipo === "gerente" || grupo?.perfil === "gerente");
  const papel: PapelAtendimento = isAdmin ? "admin" : isGerente ? "gerente" : "vendedor";
  if (papel === "vendedor") return { usuarioId: eu.id, papel, membros: [] };

  // Gerentes considerados (admin vê todos; gerente só ele mesmo)
  const todosGerentes = await carregarGerentesEAdministradores(estabelecimentoId);
  const gerentesAlvo = papel === "admin" ? todosGerentes : todosGerentes.filter((g) => g.id === eu.id);
  const idsGerentes = new Set(todosGerentes.map((g) => g.id));
  const idsAlvo = gerentesAlvo.map((g) => g.id);
  if (idsAlvo.length === 0) idsAlvo.push(eu.id);

  // Empresas-vendedor de cada gerente (gerente_vendedores + empresa_vinculos do gerente)
  const [{ data: gv }, { data: ev }] = await Promise.all([
    supabase.from("gerente_vendedores").select("gerente_usuario_id, vendedor_empresa_id").eq("estabelecimento_id", estabelecimentoId).in("gerente_usuario_id", idsAlvo),
    supabase.from("empresa_vinculos").select("usuario_id, vendedor_id").eq("estabelecimento_id", estabelecimentoId).not("vendedor_id", "is", null).not("usuario_id", "is", null),
  ]);

  const gerentePorVendedorEmpresa = new Map<string, string>();
  (gv || []).forEach((r: any) => gerentePorVendedorEmpresa.set(r.vendedor_empresa_id, r.gerente_usuario_id));
  (ev || []).forEach((r: any) => {
    if (idsAlvo.includes(r.usuario_id) && !gerentePorVendedorEmpresa.has(r.vendedor_id)) {
      gerentePorVendedorEmpresa.set(r.vendedor_id, r.usuario_id);
    }
  });

  // Usuários vendedores ligados a essas empresas-vendedor
  const vendedorGerente = new Map<string, string>();
  (ev || []).forEach((r: any) => {
    const gerente = gerentePorVendedorEmpresa.get(r.vendedor_id);
    if (!gerente || idsGerentes.has(r.usuario_id) || r.usuario_id === eu.id) return;
    if (!vendedorGerente.has(r.usuario_id)) vendedorGerente.set(r.usuario_id, gerente);
  });

  // Representantes com acesso ao sistema (usuarios.vendedor_empresa_id)
  const empresasVend = [...gerentePorVendedorEmpresa.keys()];
  if (empresasVend.length) {
    const { data: reps } = await supabase
      .from("usuarios").select("id, vendedor_empresa_id").in("vendedor_empresa_id" as any, empresasVend);
    (reps || []).forEach((r: any) => {
      const gerente = gerentePorVendedorEmpresa.get(r.vendedor_empresa_id);
      if (gerente && r.id !== eu.id && !idsGerentes.has(r.id)) vendedorGerente.set(r.id, gerente);
    });
  }

  const idsVend = [...vendedorGerente.keys()];
  const nomes = new Map<string, string>();
  if (idsVend.length) {
    const { data: us } = await supabase.from("usuarios").select("id, nome").in("id", idsVend);
    (us || []).forEach((u: any) => nomes.set(u.id, u.nome || "Sem nome"));
  }

  const membros: MembroEquipe[] = [
    ...gerentesAlvo.filter((g) => g.id !== eu.id).map((g) => ({ id: g.id, nome: g.nome, papel: "gerente" as const })),
    ...idsVend.map((id) => ({ id, nome: nomes.get(id) || "Sem nome", papel: "vendedor" as const, gerenteId: vendedorGerente.get(id) })),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { usuarioId: eu.id, papel, membros };
}

/** Resolve o escopo escolhido em lista de usuarios.id visíveis. */
export function resolverIdsVisiveis(equipe: EquipeVisivel | null, escopo: string): string[] {
  if (!equipe) return [];
  if (equipe.papel === "vendedor" || escopo === "meus") return [equipe.usuarioId];
  if (escopo === "equipe") {
    // Gerente: ele + vendedores. Admin: ele + todos gerentes + vendedores.
    return [equipe.usuarioId, ...equipe.membros.map((m) => m.id)];
  }
  const membro = equipe.membros.find((m) => m.id === escopo);
  if (!membro) return [equipe.usuarioId];
  if (membro.papel === "gerente") {
    // Gerente escolhido pelo admin: ele + os vendedores dele
    return [membro.id, ...equipe.membros.filter((m) => m.gerenteId === membro.id).map((m) => m.id)];
  }
  return [membro.id];
}
