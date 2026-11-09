import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const DIA = 86_400_000;

export type PublicoId = "recompra" | "comprou_produto" | "inativos" | "orc_aberto" | "perdido_preco";
export const PUBLICOS: { id: PublicoId; rotulo: string; desc: string }[] = [
  { id: "recompra", rotulo: "Hora da recompra", desc: "Ciclo médio de compras vencido ou a vencer em até 5 dias" },
  { id: "comprou_produto", rotulo: "Já compraram o produto", desc: "Compraram o produto escolhido nos últimos 12 meses" },
  { id: "inativos", rotulo: "Reativar inativos", desc: "Compravam e estão há mais de 60 dias sem pedido" },
  { id: "orc_aberto", rotulo: "Orçamento sem retorno", desc: "Proposta aberta há mais de 3 dias" },
  { id: "perdido_preco", rotulo: "Perdido por preço", desc: "Orçamento perdido por preço nos últimos 6 meses" },
];

export interface OrcResumo {
  clienteId: string; etapa: string; criado: string; motivoPerda?: string | null; produtos: string[];
}
export interface Protecao { contatadoRecente: Set<string>; comTarefaFutura: Set<string> }

/** Ciclo médio em dias entre compras (precisa de ao menos 2 compras). */
export function cicloMedio(datas: number[]): number | null {
  if (datas.length < 2) return null;
  const o = [...datas].sort((a, b) => a - b);
  return (o[o.length - 1] - o[0]) / (o.length - 1) / DIA;
}

/** Decide quais clientes entram em cada público e o motivo exibido. Pura: testável. */
export function classificarPublico(
  publico: PublicoId, orcs: OrcResumo[], hoje: number, produtoId?: string | null,
): Map<string, string> {
  const porCli = new Map<string, OrcResumo[]>();
  for (const o of orcs) { const l = porCli.get(o.clienteId) ?? []; l.push(o); porCli.set(o.clienteId, l); }
  const out = new Map<string, string>();
  for (const [cli, lista] of porCli) {
    const compras = lista.filter((o) => o.etapa === "finalizado").map((o) => Date.parse(o.criado)).filter(Number.isFinite);
    const ultima = compras.length ? Math.max(...compras) : null;
    const dias = ultima ? Math.floor((hoje - ultima) / DIA) : null;
    if (publico === "recompra") {
      const c = cicloMedio(compras);
      if (c && dias !== null && dias >= c - 5 && dias <= c * 2) out.set(cli, `Último pedido há ${dias} dias (ciclo ~${Math.round(c)})`);
    } else if (publico === "inativos") {
      if (compras.length >= 2 && dias !== null && dias > 60) out.set(cli, `Sem pedido há ${dias} dias`);
    } else if (publico === "comprou_produto") {
      if (!produtoId) continue;
      const n = lista.filter((o) => o.etapa === "finalizado" && hoje - Date.parse(o.criado) <= 365 * DIA && o.produtos.includes(produtoId)).length;
      if (n) out.set(cli, `Comprou este item ${n}x`);
    } else if (publico === "orc_aberto") {
      const ab = lista.filter((o) => ["orcamento", "negociacao", "aprovacao_gerencia"].includes(o.etapa) && hoje - Date.parse(o.criado) > 3 * DIA);
      if (ab.length) out.set(cli, `Orçamento aberto há ${Math.floor((hoje - Date.parse(ab[0].criado)) / DIA)} dias`);
    } else if (publico === "perdido_preco") {
      if (lista.some((o) => o.etapa === "perdido" && /pre[cç]o|caro|valor/i.test(o.motivoPerda ?? "") && hoje - Date.parse(o.criado) <= 180 * DIA))
        out.set(cli, "Perdido por preço");
    }
  }
  return out;
}

/** Remove contatos protegidos (ligados recentemente ou com retorno já agendado). */
export function aplicarProtecao(ids: Map<string, string>, p: Protecao, ativa: { recente: boolean; agendado: boolean }) {
  const r = new Map(ids);
  for (const id of ids.keys()) {
    if ((ativa.recente && p.contatadoRecente.has(id)) || (ativa.agendado && p.comTarefaFutura.has(id))) r.delete(id);
  }
  return r;
}

export async function carregarDadosPublico(estab: string, clientes: { id: string; telefone?: string | null }[]) {
  const desde = new Date(Date.now() - 400 * DIA).toISOString();
  const hoje = new Date().toISOString().slice(0, 10);
  const [o, t, c] = await Promise.all([
    db.from("orcamentos").select("cliente_id, etapa, created_at, motivo_perda, orcamento_itens(produto_id)")
      .eq("estabelecimento_id", estab).gte("created_at", desde).limit(5000),
    db.from("calendario_tarefas").select("contact_id").gt("date", hoje)
      .not("status", "in", '("concluido","cancelado","completed")').limit(5000),
    db.from("voz_chamadas").select("numero").eq("estabelecimento_id", estab)
      .gte("iniciada_em", new Date(Date.now() - 7 * DIA).toISOString()).limit(5000),
  ]);
  const orcs: OrcResumo[] = (o.data ?? []).filter((x: any) => x.cliente_id).map((x: any) => ({
    clienteId: x.cliente_id, etapa: x.etapa, criado: x.created_at, motivoPerda: x.motivo_perda,
    produtos: (x.orcamento_itens ?? []).map((i: any) => i.produto_id).filter(Boolean),
  }));
  const fins = new Set((c.data ?? []).map((x: any) => String(x.numero ?? "").replace(/\D/g, "").slice(-8)).filter((s: string) => s.length === 8));
  const contatadoRecente = new Set(clientes.filter((cl) => fins.has(String(cl.telefone ?? "").replace(/\D/g, "").slice(-8))).map((cl) => cl.id));
  const comTarefaFutura = new Set<string>((t.data ?? []).map((x: any) => x.contact_id).filter(Boolean));
  return { orcs, protecao: { contatadoRecente, comTarefaFutura } as Protecao };
}

export interface ConfigOferta {
  produtoNome?: string; condicao?: string; descontoMax?: number;
  reposicao: boolean; similar: boolean; complementares: boolean; recepcao: boolean; texto?: string;
}

/** Monta o objetivo enviado ao agente a partir do formulário da campanha. */
export function montarObjetivo(c: ConfigOferta): string {
  const p: string[] = [];
  if (c.produtoNome) p.push(`Produto a ofertar: ${c.produtoNome}.`);
  if (c.condicao?.trim()) p.push(`Condição da campanha (pode informar ao cliente): ${c.condicao.trim()}.`);
  if (c.descontoMax && c.descontoMax > 0)
    p.push(`Se o cliente achar caro, você pode oferecer até ${c.descontoMax}% de desconto, nunca mais que isso.`);
  if (c.reposicao) p.push("Use a última compra do cliente para abordar reposição de forma natural.");
  if (c.similar) p.push("Se ele já tiver estoque ou recusar, ofereça um produto similar que ele costuma comprar.");
  if (c.complementares) p.push("Sugira um produto complementar ao que ele já compra.");
  if (c.recepcao) p.push("Se atender recepção/portaria, peça para falar com o responsável por compras (o contato cadastrado); se não estiver, pergunte o melhor horário e ramal.");
  if (c.texto?.trim()) p.push(c.texto.trim());
  return p.join(" ");
}
