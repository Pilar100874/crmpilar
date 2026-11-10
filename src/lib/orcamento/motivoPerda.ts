import { supabase } from "@/integrations/supabase/client";

export type TipoMotivoPerda = "preco" | "estoque" | "prazo_entrega" | "pagamento" | "desistencia" | "outro";

export const MOTIVOS_PERDA: { id: TipoMotivoPerda; rotulo: string }[] = [
  { id: "preco", rotulo: "Preço / Concorrente" },
  { id: "estoque", rotulo: "Falta de estoque" },
  { id: "prazo_entrega", rotulo: "Prazo de entrega" },
  { id: "pagamento", rotulo: "Condição de pagamento" },
  { id: "desistencia", rotulo: "Desistência do cliente" },
  { id: "outro", rotulo: "Outro" },
];

export interface ItemPerda { itemId: string; nome: string; nossoPreco: number; precoCliente?: number }
export interface MotivoPerda {
  tipo: TipoMotivoPerda | "";
  itens: ItemPerda[];
  concorrente?: string;
  prazoSolicitado?: string;
  prazoOfertado?: string;
  condicaoExigida?: string;
  observacao?: string;
}

/** Retorna a lista de pendências; vazia = motivo completo e pode salvar. */
export function validarMotivoPerda(m: MotivoPerda): string[] {
  const f: string[] = [];
  if (!m.tipo) return ["Escolha o motivo"];
  if (m.tipo === "preco") {
    if (!m.itens.length) f.push("Selecione ao menos um item com problema de preço");
    if (m.itens.some((i) => !(Number(i.precoCliente) > 0))) f.push("Informe o valor que o cliente tinha para cada item");
  }
  if (m.tipo === "estoque" && !m.itens.length) f.push("Selecione os itens sem estoque");
  if (m.tipo === "prazo_entrega" && (!m.prazoSolicitado?.trim() || !m.prazoOfertado?.trim())) f.push("Informe o prazo pedido e o ofertado");
  if (m.tipo === "pagamento" && !m.condicaoExigida?.trim()) f.push("Informe a condição exigida pelo cliente");
  if ((m.tipo === "desistencia" || m.tipo === "outro") && (m.observacao?.trim().length ?? 0) < 5) f.push("Descreva o motivo");
  return f;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto legível gravado em orcamentos.motivo_perda (começa sempre pelo rótulo do motivo). */
export function formatarMotivoPerda(m: MotivoPerda): string {
  const rotulo = MOTIVOS_PERDA.find((x) => x.id === m.tipo)?.rotulo ?? "Outro";
  const partes = [rotulo];
  if (m.tipo === "preco") {
    partes.push(m.itens.map((i) => `${i.nome}: nosso ${brl(i.nossoPreco)} x cliente ${brl(Number(i.precoCliente) || 0)}`).join("; "));
    if (m.concorrente?.trim()) partes.push(`Concorrente: ${m.concorrente.trim()}`);
  }
  if (m.tipo === "estoque") partes.push(`Sem estoque: ${m.itens.map((i) => i.nome).join(", ")}`);
  if (m.tipo === "prazo_entrega") partes.push(`Pedido ${m.prazoSolicitado} x ofertado ${m.prazoOfertado}`);
  if (m.tipo === "pagamento") partes.push(`Exigiu: ${m.condicaoExigida}`);
  if (m.observacao?.trim()) partes.push(m.observacao.trim());
  return partes.join(" — ");
}

/** Marca o orçamento como perdido com o motivo e registra no histórico. */
export async function registrarPerda(orcamentoId: string, m: MotivoPerda, etapaAnterior?: string) {
  const pend = validarMotivoPerda(m);
  if (pend.length) throw new Error(pend[0]);
  const texto = formatarMotivoPerda(m);
  const { error } = await supabase.from("orcamentos").update({ etapa: "perdido", motivo_perda: texto }).eq("id", orcamentoId);
  if (error) throw error;
  const { data: uid } = await supabase.rpc("get_current_usuario_id");
  await supabase.from("orcamento_historico").insert({
    orcamento_id: orcamentoId, acao: "perdido_motivo", tipo_usuario: "usuario", usuario_id: (uid as string) ?? null,
    dados_anteriores: { etapa: etapaAnterior ?? null }, dados_novos: { etapa: "perdido", motivo: texto, detalhes: m as any },
  });
  return texto;
}
