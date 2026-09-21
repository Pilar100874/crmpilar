import { supabase } from "@/integrations/supabase/client";

export interface ResumoCliente {
  nome: string;
  telefone: string;
  email?: string | null;
  empresa?: string | null;
  cidade?: string | null;
}

const somenteDigitos = (valor: string) => (valor || "").replace(/\D/g, "");

/**
 * Busca no cadastro de clientes um resumo pelo telefone (casa pelos
 * últimos dígitos, ignorando formatação, DDI e prefixos).
 */
export async function buscarResumoClientePorTelefone(telefone: string): Promise<ResumoCliente | null> {
  const digitos = somenteDigitos(telefone);
  if (digitos.length < 8) return null;

  // Casa pelo final do número (8 e 9 dígitos cobrem fixo e celular com/sem DDD/DDI)
  const finais = Array.from(new Set([digitos.slice(-8), digitos.slice(-9)]));
  const filtro = finais
    .flatMap((f) => [`telefone.ilike.%${f}`, `tel.ilike.%${f}`])
    .join(",");

  try {
    const { data, error } = await supabase
      .from("customers")
      .select("nome, telefone, tel, email, cidade, estado, empresa_id")
      .or(filtro)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    let empresa: string | null = null;
    if (data.empresa_id) {
      const { data: emp } = await supabase
        .from("empresas")
        .select("nome_fantasia, nome")
        .eq("id", data.empresa_id)
        .maybeSingle();
      empresa = emp?.nome_fantasia || emp?.nome || null;
    }

    return {
      nome: data.nome,
      telefone: data.telefone || data.tel || telefone,
      email: data.email,
      empresa,
      cidade: [data.cidade, data.estado].filter(Boolean).join("/") || null,
    };
  } catch {
    return null;
  }
}
