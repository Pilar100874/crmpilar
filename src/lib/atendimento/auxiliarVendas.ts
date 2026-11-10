import { supabase } from "@/integrations/supabase/client";

/** Pedido/orçamento simplificado usado na análise de hábitos do cliente. */
export interface PedidoHabito {
  id: string;
  data: string; // ISO
  etapa: string | null;
  valor: number;
  percentualDesconto: number;
  condicao: string | null;
  motivoPerda?: string | null;
  itens: { produtoId: string; nome: string; quantidade: number; preco: number }[];
}

export interface ProdutoHabito { produtoId: string; nome: string; vezes: number; quantidadeMedia: number; ultimoPreco: number; ultimaCompra: string }

export interface AnaliseHabitos {
  totalPedidos: number;
  totalOrcamentos: number;
  conversao: number | null; // 0..1
  ticketMedio: number | null;
  intervaloMedioDias: number | null;
  diasDesdeUltima: number | null;
  proximaCompraPrevista: string | null;
  compraAtrasada: boolean;
  condicaoPreferida: string | null;
  descontoMedio: number | null;
  produtosFrequentes: ProdutoHabito[];
  produtosSumidos: ProdutoHabito[];
  sugestoes: string[];
}

const ETAPA_PEDIDO = "finalizado";
const DIA = 86_400_000;
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Analisa o histórico de pedidos do cliente e devolve hábitos e sugestões de venda. Função pura. */
export function analisarHabitos(registros: PedidoHabito[], hoje: Date = new Date()): AnaliseHabitos {
  const pedidos = registros.filter((r) => r.etapa === ETAPA_PEDIDO).sort((a, b) => a.data.localeCompare(b.data));
  const totalOrcamentos = registros.length;
  const conversao = totalOrcamentos ? pedidos.length / totalOrcamentos : null;
  const ticketMedio = pedidos.length ? pedidos.reduce((s, p) => s + p.valor, 0) / pedidos.length : null;

  let intervaloMedioDias: number | null = null;
  if (pedidos.length >= 2) {
    const t = pedidos.map((p) => new Date(p.data).getTime());
    intervaloMedioDias = Math.round((t[t.length - 1] - t[0]) / (t.length - 1) / DIA);
  }
  const ultima = pedidos[pedidos.length - 1];
  const diasDesdeUltima = ultima ? Math.floor((hoje.getTime() - new Date(ultima.data).getTime()) / DIA) : null;
  const proximaCompraPrevista = ultima && intervaloMedioDias
    ? new Date(new Date(ultima.data).getTime() + intervaloMedioDias * DIA).toISOString() : null;
  const compraAtrasada = !!(intervaloMedioDias && diasDesdeUltima !== null && diasDesdeUltima > intervaloMedioDias);

  const contCond = new Map<string, number>();
  pedidos.forEach((p) => p.condicao && contCond.set(p.condicao, (contCond.get(p.condicao) || 0) + 1));
  const condicaoPreferida = [...contCond.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const descontoMedio = pedidos.length ? pedidos.reduce((s, p) => s + (p.percentualDesconto || 0), 0) / pedidos.length : null;

  const mapa = new Map<string, ProdutoHabito & { somaQtd: number }>();
  pedidos.forEach((p) => p.itens.forEach((i) => {
    const atual = mapa.get(i.produtoId) ?? { produtoId: i.produtoId, nome: i.nome, vezes: 0, quantidadeMedia: 0, ultimoPreco: i.preco, ultimaCompra: p.data, somaQtd: 0 };
    atual.vezes += 1; atual.somaQtd += i.quantidade; atual.ultimoPreco = i.preco; atual.ultimaCompra = p.data;
    mapa.set(i.produtoId, atual);
  }));
  const produtos = [...mapa.values()].map(({ somaQtd, ...p }) => ({ ...p, quantidadeMedia: Math.round((somaQtd / p.vezes) * 10) / 10 }));
  const produtosFrequentes = [...produtos].sort((a, b) => b.vezes - a.vezes || b.ultimaCompra.localeCompare(a.ultimaCompra)).slice(0, 5);
  const idsUltimo = new Set(ultima?.itens.map((i) => i.produtoId) ?? []);
  const produtosSumidos = produtos.filter((p) => p.vezes >= 2 && !idsUltimo.has(p.produtoId)).sort((a, b) => b.vezes - a.vezes).slice(0, 5);

  const sugestoes: string[] = [];
  if (!pedidos.length) {
    sugestoes.push(totalOrcamentos
      ? `Cliente tem ${totalOrcamentos} orçamento(s) sem fechamento — retome o último e pergunte o que impediu a compra.`
      : "Cliente ainda sem histórico de compras — apresente os produtos de entrada e entenda a necessidade.");
    const perda = registros.find((r) => r.motivoPerda)?.motivoPerda;
    if (perda) sugestoes.push(`Último motivo de perda registrado: "${perda}". Prepare uma resposta para essa objeção.`);
  } else {
    if (compraAtrasada) sugestoes.push(`Costuma comprar a cada ${intervaloMedioDias} dias e já está há ${diasDesdeUltima} dias sem comprar — bom momento para oferecer reposição.`);
    else if (proximaCompraPrevista) sugestoes.push(`Próxima compra prevista para ${dataBR(proximaCompraPrevista)} (ciclo médio de ${intervaloMedioDias} dias).`);
    if (produtosFrequentes[0]) {
      const p = produtosFrequentes[0];
      sugestoes.push(`Ofereça ${p.nome}: comprado ${p.vezes}x, em média ${p.quantidadeMedia} un. (último preço ${moeda(p.ultimoPreco)}).`);
    }
    if (produtosSumidos.length) sugestoes.push(`Não levou no último pedido: ${produtosSumidos.map((p) => p.nome).join(", ")} — pergunte se ainda precisa.`);
    if (ticketMedio) sugestoes.push(`Ticket médio de ${moeda(ticketMedio)} — mire uma proposta próxima ou um pouco acima desse valor.`);
    if (condicaoPreferida) sugestoes.push(`Prazo/condição preferida: ${condicaoPreferida}. Já ofereça nessa condição.`);
    if (descontoMedio && descontoMedio > 0) sugestoes.push(`Desconto médio concedido: ${descontoMedio.toFixed(1)}% — evite passar disso sem necessidade.`);
  }
  if (conversao !== null && totalOrcamentos >= 3 && conversao < 0.4) sugestoes.push(`Conversão baixa (${Math.round(conversao * 100)}% dos orçamentos viram pedido) — faça follow-up rápido após enviar a proposta.`);

  return { totalPedidos: pedidos.length, totalOrcamentos, conversao, ticketMedio, intervaloMedioDias, diasDesdeUltima, proximaCompraPrevista, compraAtrasada, condicaoPreferida, descontoMedio, produtosFrequentes, produtosSumidos, sugestoes };
}

/** Busca os orçamentos/pedidos do contato já no formato da análise. */
export async function carregarHabitosCliente(clienteId: string): Promise<PedidoHabito[]> {
  const { data, error } = await (supabase as any)
    .from("orcamentos")
    .select("id, created_at, etapa, valor_total, percentual_desconto, motivo_perda, condicoes_pagamento(nome), orcamento_itens(produto_id, quantidade, preco_unitario, produtos(nome))")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((o: any) => ({
    id: o.id, data: o.created_at, etapa: o.etapa, valor: Number(o.valor_total) || 0,
    percentualDesconto: Number(o.percentual_desconto) || 0, condicao: o.condicoes_pagamento?.nome ?? null, motivoPerda: o.motivo_perda,
    itens: (o.orcamento_itens ?? []).filter((i: any) => i.produto_id).map((i: any) => ({
      produtoId: i.produto_id, nome: i.produtos?.nome || "Produto", quantidade: Number(i.quantidade) || 0, preco: Number(i.preco_unitario) || 0,
    })),
  }));
}
