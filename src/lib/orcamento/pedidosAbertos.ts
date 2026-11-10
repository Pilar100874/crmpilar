import { supabase } from "@/integrations/supabase/client";

/** Etapas em que o orçamento/pedido ainda está em aberto e exige acompanhamento diário. */
export const ETAPAS_ABERTAS = ["orcamento", "negociacao", "aprovacao_gerencia"] as const;

export interface PedidoAberto { id: string; clienteId: string; etapa: string; valor: number; criado: string }
export interface ResumoPedidosAbertos { quantidade: number; valor: number; maisAntigo: string; orcamentoId: string }

export const etapaAberta = (etapa?: string | null) => !!etapa && (ETAPAS_ABERTAS as readonly string[]).includes(etapa);

/** Agrupa os pedidos abertos por cliente (soma valores, guarda o mais antigo). */
export function resumirPedidosAbertos(pedidos: PedidoAberto[]): Map<string, ResumoPedidosAbertos> {
  const mapa = new Map<string, ResumoPedidosAbertos>();
  for (const p of pedidos) {
    if (!p.clienteId || !etapaAberta(p.etapa)) continue;
    const atual = mapa.get(p.clienteId);
    if (!atual) { mapa.set(p.clienteId, { quantidade: 1, valor: p.valor || 0, maisAntigo: p.criado, orcamentoId: p.id }); continue; }
    atual.quantidade += 1;
    atual.valor += p.valor || 0;
    if (p.criado < atual.maisAntigo) { atual.maisAntigo = p.criado; atual.orcamentoId = p.id; }
  }
  return mapa;
}

/** Clientes com pedido aberto que não têm tarefa visível hoje: viram cartão diário de acompanhamento. */
export function clientesSemTarefaHoje(abertos: Map<string, ResumoPedidosAbertos>, contatosComTarefa: Set<string>): string[] {
  return [...abertos.keys()].filter((id) => !contatosComTarefa.has(id));
}

export const rotuloPedidoAberto = (r: ResumoPedidosAbertos) =>
  `Pedido em aberto${r.quantidade > 1 ? ` (${r.quantidade})` : ""} • ${r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

export async function carregarPedidosAbertos(clienteIds: string[]): Promise<PedidoAberto[]> {
  const out: PedidoAberto[] = [];
  for (let i = 0; i < clienteIds.length; i += 100) {
    const { data, error } = await supabase.from("orcamentos")
      .select("id, cliente_id, etapa, valor_total, created_at")
      .in("cliente_id", clienteIds.slice(i, i + 100))
      .in("etapa", [...ETAPAS_ABERTAS]);
    if (error) throw error;
    for (const o of data ?? []) out.push({ id: o.id, clienteId: o.cliente_id as string, etapa: o.etapa as string, valor: Number(o.valor_total) || 0, criado: o.created_at as string });
  }
  return out;
}
