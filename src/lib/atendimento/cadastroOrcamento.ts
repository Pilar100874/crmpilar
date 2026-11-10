import { supabase } from "@/integrations/supabase/client";
import { pendenciasCadastro } from "./pendenciasCadastro";

export interface CadastroOrcamento {
  contato?: { id: string; nome: string | null; telefone: string | null; tel: string | null; email: string | null; custom_fields?: unknown } | null;
  empresa?: { id: string; nome: string | null; cnpj: string | null } | null;
  vinculado: boolean;
  responsavel: boolean;
}

export function pendenciasOrcamento(cadastro: CadastroOrcamento): string[] {
  const { contato, empresa } = cadastro;
  const faltas = pendenciasCadastro({
    nome: contato?.nome || undefined,
    telefone: contato?.tel || undefined,
    whatsapp: contato?.telefone || undefined,
    email: contato?.email || undefined,
    companies: empresa && cadastro.vinculado ? [empresa] : [],
  });
  if (!contato) faltas.unshift("Contato cadastrado");
  if ((contato?.custom_fields as Record<string, unknown> | null)?.contato_temporario) faltas.unshift("Dados do contato real");
  if (contato && !cadastro.responsavel) faltas.push("Usuário responsável pelo contato");
  return faltas;
}

export async function carregarCadastroOrcamento(contatoId?: string | null, empresaId?: string | null): Promise<CadastroOrcamento> {
  let id = contatoId;
  if (!id && empresaId) {
    const { data, error } = await supabase.from("customer_empresas")
      .select("customer_id").eq("empresa_id", empresaId).order("is_primary", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    id = data?.customer_id;
  }
  if (!id) return { contato: null, empresa: null, vinculado: false, responsavel: false };
  const [contato, empresas, responsaveis] = await Promise.all([
    supabase.from("customers").select("id,nome,telefone,tel,email,custom_fields").eq("id", id).maybeSingle(),
    supabase.from("customer_empresas").select("empresa_id,is_primary,empresas(id,nome,cnpj)").eq("customer_id", id).order("is_primary", { ascending: false }),
    supabase.from("customer_vinculos").select("usuario_id").eq("customer_id", id).not("usuario_id", "is", null).limit(1),
  ]);
  if (contato.error) throw contato.error;
  if (empresas.error) throw empresas.error;
  if (responsaveis.error) throw responsaveis.error;
  const vinculo = empresaId ? empresas.data?.find((v) => v.empresa_id === empresaId) : empresas.data?.[0];
  return { contato: contato.data, empresa: vinculo?.empresas || null, vinculado: !!vinculo, responsavel: !!responsaveis.data?.length };
}