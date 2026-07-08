// Monta o objeto de dados de merge a partir do tipo/id de registro.
import { supabase } from "@/integrations/supabase/client";

export type RegistroTipo =
  | "cliente"
  | "fornecedor"
  | "funcionario"
  | "pedido"
  | "orcamento"
  | "empresa"
  | "livre";

function fmtDataBR(v?: string | null): string {
  if (!v) return "";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return String(v);
  }
}

function fmtMoedaBR(v?: number | string | null): string {
  if (v === undefined || v === null || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Retorna um objeto plano com as chaves esperadas em `{{campo}}`. */
export async function resolveMergeData(
  tipo: RegistroTipo,
  registroId: string | null,
  overrides: Record<string, any> = {},
): Promise<Record<string, any>> {
  const base: Record<string, any> = {
    data_atual: new Date().toLocaleDateString("pt-BR"),
  };

  if (!registroId || tipo === "livre") return { ...base, ...overrides };

  try {
    if (tipo === "cliente") {
      const { data } = await supabase.from("customers").select("*").eq("id", registroId).maybeSingle();
      if (data) {
        Object.assign(base, {
          nome_cliente: (data as any).nome || (data as any).name,
          cpf_cnpj: (data as any).cpf_cnpj,
          endereco: (data as any).endereco,
          telefone: (data as any).telefone,
          email: (data as any).email,
          cliente: data,
        });
      }
    } else if (tipo === "empresa" || tipo === "fornecedor") {
      const { data } = await supabase.from("empresas").select("*").eq("id", registroId).maybeSingle();
      if (data) {
        Object.assign(base, {
          nome_empresa: (data as any).nome_fantasia || (data as any).razao_social,
          cpf_cnpj: (data as any).cnpj,
          endereco: (data as any).endereco,
          telefone: (data as any).telefone,
          email: (data as any).email,
          empresa: data,
        });
      }
    } else if (tipo === "funcionario") {
      const { data } = await supabase
        .from("ponto_funcionarios")
        .select("*")
        .eq("id", registroId)
        .maybeSingle();
      if (data) {
        Object.assign(base, {
          nome_cliente: (data as any).nome,
          cpf_cnpj: (data as any).cpf,
          funcionario: data,
        });
      }
    } else if (tipo === "orcamento") {
      const { data } = await supabase.from("orcamentos").select("*").eq("id", registroId).maybeSingle();
      if (data) {
        Object.assign(base, {
          valor: fmtMoedaBR((data as any).valor_total),
          descricao: (data as any).observacoes,
          numero_contrato: (data as any).numero,
          data_vencimento: fmtDataBR((data as any).validade),
          orcamento: data,
        });
      }
    } else if (tipo === "pedido") {
      const { data } = await supabase
        .from("pedidos_ecommerce")
        .select("*")
        .eq("id", registroId)
        .maybeSingle();
      if (data) {
        Object.assign(base, {
          valor: fmtMoedaBR((data as any).valor_total),
          numero_contrato: (data as any).numero_pedido,
          pedido: data,
        });
      }
    }
  } catch (e) {
    console.warn("[dataResolvers] erro:", e);
  }

  return { ...base, ...overrides };
}

export const REGISTRO_TIPOS: { value: RegistroTipo; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "empresa", label: "Empresa" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "funcionario", label: "Funcionário" },
  { value: "orcamento", label: "Orçamento" },
  { value: "pedido", label: "Pedido" },
  { value: "livre", label: "Preenchimento manual" },
];
