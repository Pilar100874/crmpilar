import { supabase } from "@/integrations/supabase/client";
import { getUserIdFromAuth } from "@/lib/estabelecimentoUtils";

export function usuariosComCriador(criador: string, selecionados: string[]): string[] {
  return [...new Set([criador, ...selecionados].filter(Boolean))];
}

export async function exigirUsuarioCriador(): Promise<string> {
  const id = await getUserIdFromAuth();
  if (!id) throw new Error("Usuário responsável não encontrado. Entre novamente antes de cadastrar.");
  return id;
}

export async function vincularContatoAoCriador(contatoId: string, estabelecimentoId: string, criador: string, selecionados: string[] = []) {
  const usuarios = usuariosComCriador(criador, selecionados);
  const { data, error } = await supabase.from("customer_vinculos").select("usuario_id").eq("customer_id", contatoId).in("usuario_id", usuarios);
  if (error) throw error;
  const existentes = new Set((data ?? []).map(v => v.usuario_id));
  const faltantes = usuarios.filter(id => !existentes.has(id));
  if (!faltantes.length) return;
  const { error: inserirErro } = await supabase.from("customer_vinculos").insert(faltantes.map(usuario_id => ({ customer_id: contatoId, estabelecimento_id: estabelecimentoId, usuario_id })));
  if (inserirErro) throw inserirErro;
}

/** O contato temporário é criado pelo mesmo trigger usado pelo módulo Empresas. */
export async function vincularEmpresaAoCriador(empresaId: string, estabelecimentoId: string, criador: string) {
  const { data: contatos, error } = await supabase.from("customer_empresas").select("customer_id").eq("empresa_id", empresaId);
  if (error) throw error;
  for (const contato of contatos ?? []) await vincularContatoAoCriador(contato.customer_id, estabelecimentoId, criador);
  const { data: existente, error: consultaErro } = await supabase.from("empresa_vinculos").select("id").eq("empresa_id", empresaId).eq("usuario_id", criador).is("vendedor_id", null).limit(1);
  if (consultaErro) throw consultaErro;
  if (existente?.length) return;
  const { error: inserirErro } = await supabase.from("empresa_vinculos").insert({ empresa_id: empresaId, estabelecimento_id: estabelecimentoId, usuario_id: criador, vendedor_id: null, segmento_id: null });
  if (inserirErro) throw inserirErro;
}