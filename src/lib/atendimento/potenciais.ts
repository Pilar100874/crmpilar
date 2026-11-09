import { supabase } from "@/integrations/supabase/client";
import { cicloMedio } from "@/lib/voz/publicoInteligente";

const db = supabase as any;
const DIA = 86_400_000;

export type TipoPotencial = "recompra" | "orcamento" | "inativo" | "acao_comercial" | "queda_volume" | "cross_sell";

export interface ItemRef { id: string; nome: string }
export interface ParCrossSell { base: ItemRef | null; complemento: ItemRef | null }

export interface ConfigPotenciais {
  recompra: { ativo: boolean; antecedenciaDias: number };
  orcamento: { ativo: boolean; diasAberto: number; valorMinimo: number };
  inativo: { ativo: boolean; diasSemCompra: number; minCompras: number };
  acaoComercial: { ativo: boolean; produtos: ItemRef[]; grupos: ItemRef[]; mesesHistorico: number; semCompraDias: number; descricao: string };
  quedaVolume: { ativo: boolean; percentual: number; janelaDias: number };
  crossSell: { ativo: boolean; pares: ParCrossSell[] };
  protecao: { limite: number; contatoRecenteDias: number; ignorarComTarefa: boolean };
  roboIa: { ativo: boolean; horario: string; clientesPorDia: number; agenteId: string; remarcarDias: number; diasUteis: boolean };
  plantao: { ativo: boolean; inicio: string; fim: string; sabado: boolean; domingo: boolean; texto: string };
}

export const CONFIG_PADRAO: ConfigPotenciais = {
  recompra: { ativo: true, antecedenciaDias: 3 },
  orcamento: { ativo: true, diasAberto: 3, valorMinimo: 0 },
  inativo: { ativo: true, diasSemCompra: 60, minCompras: 2 },
  acaoComercial: { ativo: false, produtos: [], grupos: [], mesesHistorico: 6, semCompraDias: 15, descricao: "Produto em promoção" },
  quedaVolume: { ativo: true, percentual: 50, janelaDias: 60 },
  crossSell: { ativo: false, pares: [] },
  protecao: { limite: 20, contatoRecenteDias: 3, ignorarComTarefa: true },
  roboIa: { ativo: false, horario: "10:00", clientesPorDia: 10, agenteId: "", remarcarDias: 3, diasUteis: true },
  plantao: { ativo: false, inicio: "08:00", fim: "18:00", sabado: false, domingo: false, texto: "Olá! Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos no primeiro horário útil." },
};

export const ROTULO_TIPO: Record<TipoPotencial, string> = {
  recompra: "Ciclo de recompra",
  orcamento: "Orçamento sem retorno",
  inativo: "Inativo com histórico",
  acao_comercial: "Ação comercial",
  queda_volume: "Queda no volume",
  cross_sell: "Complemento de linha",
};

/** Ordem de prioridade quando o cliente se encaixa em mais de um motivo. */
const PRIORIDADE: TipoPotencial[] = ["orcamento", "acao_comercial", "recompra", "queda_volume", "cross_sell", "inativo"];

export function mesclarConfig(bruto: any): ConfigPotenciais {
  const b = bruto && typeof bruto === "object" ? bruto : {};
  const out: any = {};
  for (const k of Object.keys(CONFIG_PADRAO) as (keyof ConfigPotenciais)[]) out[k] = { ...CONFIG_PADRAO[k], ...(b[k] ?? {}) };
  return out as ConfigPotenciais;
}

export interface OrcPotencial {
  clienteId: string; etapa: string; criado: string; valor: number;
  itens: { produtoId: string; categoriaId?: string | null }[];
}
export interface Potencial { clienteId: string; tipo: TipoPotencial; motivo: string; motivos: string[]; produto?: string }

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const ABERTOS = ["orcamento", "negociacao", "aprovacao_gerencia"];

/**
 * Decide quem é potencial e por quê. Pura (testável): recebe orçamentos, configuração,
 * clientes bloqueados (tarefa pendente, contato recente, dispensados) e nomes dos produtos.
 */
export function calcularPotenciais(
  orcs: OrcPotencial[], cfg: ConfigPotenciais, hoje: number,
  bloqueados: Set<string> = new Set(), nomesProduto: Map<string, string> = new Map(),
): Potencial[] {
  const porCli = new Map<string, OrcPotencial[]>();
  for (const o of orcs) { if (bloqueados.has(o.clienteId)) continue; const l = porCli.get(o.clienteId) ?? []; l.push(o); porCli.set(o.clienteId, l); }
  const out: Potencial[] = [];
  const focoProd = new Set(cfg.acaoComercial.produtos.map((p) => p.id));
  const focoGrupo = new Set(cfg.acaoComercial.grupos.map((g) => g.id));

  for (const [cli, lista] of porCli) {
    const achados: { tipo: TipoPotencial; motivo: string; produto?: string }[] = [];
    const compras = lista.filter((o) => o.etapa === "finalizado" && Number.isFinite(Date.parse(o.criado)));
    const datas = compras.map((o) => Date.parse(o.criado));
    const ultima = datas.length ? Math.max(...datas) : null;
    const dias = ultima !== null ? Math.floor((hoje - ultima) / DIA) : null;

    if (cfg.orcamento.ativo) {
      const ab = lista.filter((o) => ABERTOS.includes(o.etapa) && hoje - Date.parse(o.criado) >= cfg.orcamento.diasAberto * DIA && o.valor >= (cfg.orcamento.valorMinimo || 0))
        .sort((a, b) => b.valor - a.valor);
      if (ab.length) achados.push({ tipo: "orcamento", motivo: `Orçamento de ${brl(ab[0].valor)} aberto há ${Math.floor((hoje - Date.parse(ab[0].criado)) / DIA)} dias sem resposta` });
    }

    if (cfg.acaoComercial.ativo && (focoProd.size || focoGrupo.size)) {
      const janela = cfg.acaoComercial.mesesHistorico * 30 * DIA;
      let ultimaFoco: { t: number; nome: string } | null = null;
      for (const o of compras) {
        const t = Date.parse(o.criado); if (hoje - t > janela) continue;
        const it = o.itens.find((i) => focoProd.has(i.produtoId) || (i.categoriaId && focoGrupo.has(i.categoriaId)));
        if (it && (!ultimaFoco || t > ultimaFoco.t))
          ultimaFoco = { t, nome: nomesProduto.get(it.produtoId) ?? cfg.acaoComercial.produtos.find((p) => p.id === it.produtoId)?.nome ?? "item em foco" };
      }
      if (ultimaFoco) {
        const d = Math.floor((hoje - ultimaFoco.t) / DIA);
        if (d >= cfg.acaoComercial.semCompraDias)
          achados.push({ tipo: "acao_comercial", produto: ultimaFoco.nome, motivo: `Comprou ${ultimaFoco.nome} há ${d} dias (${cfg.acaoComercial.descricao || "ação comercial"})` });
      }
    }

    if (cfg.recompra.ativo && dias !== null) {
      const c = cicloMedio(datas);
      if (c && c >= 1 && dias >= c - cfg.recompra.antecedenciaDias && dias <= c * 2)
        achados.push({ tipo: "recompra", motivo: `Compra em média a cada ${Math.round(c)} dias; último pedido há ${dias} dias` });
    }

    if (cfg.quedaVolume.ativo && compras.length >= 3) {
      const j = cfg.quedaVolume.janelaDias * DIA;
      const recente = compras.filter((o) => hoje - Date.parse(o.criado) <= j).reduce((s, o) => s + o.valor, 0);
      const anteriores = compras.filter((o) => hoje - Date.parse(o.criado) > j);
      if (anteriores.length >= 2) {
        const ini = Math.min(...anteriores.map((o) => Date.parse(o.criado)));
        const periodos = Math.max(1, (hoje - j - ini) / j);
        const media = anteriores.reduce((s, o) => s + o.valor, 0) / periodos;
        const queda = media > 0 ? Math.round((1 - recente / media) * 100) : 0;
        if (recente > 0 && queda >= cfg.quedaVolume.percentual)
          achados.push({ tipo: "queda_volume", motivo: `Queda de ${queda}% no volume (média de ${brl(media)} a cada ${cfg.quedaVolume.janelaDias} dias; agora ${brl(recente)})` });
      }
    }

    if (cfg.crossSell.ativo) {
      const comprados = new Set(compras.flatMap((o) => o.itens.map((i) => i.produtoId)));
      const par = cfg.crossSell.pares.find((p) => p.base && p.complemento && comprados.has(p.base.id) && !comprados.has(p.complemento.id));
      if (par) achados.push({ tipo: "cross_sell", produto: par.complemento!.nome, motivo: `Compra ${par.base!.nome}, mas nunca comprou ${par.complemento!.nome}` });
    }

    if (cfg.inativo.ativo && compras.length >= cfg.inativo.minCompras && dias !== null && dias >= cfg.inativo.diasSemCompra)
      achados.push({ tipo: "inativo", motivo: `Sem compras há ${dias} dias (${compras.length} pedidos no histórico)` });

    if (!achados.length) continue;
    achados.sort((a, b) => PRIORIDADE.indexOf(a.tipo) - PRIORIDADE.indexOf(b.tipo));
    out.push({ clienteId: cli, tipo: achados[0].tipo, motivo: achados[0].motivo, produto: achados[0].produto, motivos: achados.map((a) => a.motivo) });
  }
  out.sort((a, b) => PRIORIDADE.indexOf(a.tipo) - PRIORIDADE.indexOf(b.tipo));
  return cfg.protecao.limite > 0 ? out.slice(0, cfg.protecao.limite) : out;
}

/** Texto sugerido para abordar o cliente conforme o motivo. */
export function mensagemSugerida(p: Potencial, nome: string): string {
  const n = nome.split(" ")[0] || nome;
  switch (p.tipo) {
    case "acao_comercial": return `Olá ${n}, tudo bem? Vi que você costuma comprar ${p.produto}. Estamos com uma condição especial nele esta semana. Posso te passar os detalhes?`;
    case "cross_sell": return `Olá ${n}, tudo bem? Para complementar o que você já compra conosco, temos ${p.produto}. Posso incluir no seu próximo pedido?`;
    case "orcamento": return `Olá ${n}, tudo bem? Passando para saber se conseguiu avaliar o orçamento que enviamos. Posso ajudar em algo?`;
    case "recompra": return `Olá ${n}, tudo bem? Pelo seu histórico, está chegando a hora da reposição. Quer que eu já prepare o pedido?`;
    case "queda_volume": return `Olá ${n}, tudo bem? Notamos que seus pedidos diminuíram. Aconteceu algo? Queremos entender como podemos atender melhor.`;
    default: return `Olá ${n}, tudo bem? Faz um tempo que não conversamos. Temos novidades que podem te interessar!`;
  }
}

export async function lerConfigPotenciais(estab: string): Promise<ConfigPotenciais> {
  const { data } = await db.from("potenciais_config").select("config").eq("estabelecimento_id", estab).maybeSingle();
  return mesclarConfig(data?.config);
}

export async function salvarConfigPotenciais(estab: string, cfg: ConfigPotenciais) {
  const { error } = await db.from("potenciais_config").upsert({ estabelecimento_id: estab, config: cfg, updated_at: new Date().toISOString() });
  if (error) throw error;
  window.dispatchEvent(new Event("atendimento:potenciais-alterados"));
}

export async function dispensarPotencial(estab: string, customerId: string, usuarioId: string | null, motivo: string, dias: number) {
  const ate = new Date(Date.now() + dias * DIA).toISOString().slice(0, 10);
  const { error } = await db.from("potenciais_dispensas").insert({ estabelecimento_id: estab, customer_id: customerId, usuario_id: usuarioId, motivo, ate });
  if (error) throw error;
  window.dispatchEvent(new Event("atendimento:potenciais-alterados"));
}

/** Carrega dados e calcula os potenciais da empresa, restritos aos clientes informados. */
export async function carregarPotenciais(estab: string, clienteIds: string[]): Promise<Potencial[]> {
  if (!clienteIds.length) return [];
  const cfg = await lerConfigPotenciais(estab);
  const hoje = new Date().toISOString().slice(0, 10);
  const desde = new Date(Date.now() - 400 * DIA).toISOString();
  const recente = new Date(Date.now() - cfg.protecao.contatoRecenteDias * DIA).toISOString();
  const ids = new Set(clienteIds);
  const [o, t, r, d] = await Promise.all([
    db.from("orcamentos").select("cliente_id, etapa, created_at, valor_total, orcamento_itens(produto_id, produtos(nome, categoria_id))")
      .eq("estabelecimento_id", estab).gte("created_at", desde).limit(5000),
    cfg.protecao.ignorarComTarefa
      ? db.from("calendario_tarefas").select("contact_id").eq("estabelecimento_id", estab).in("status", ["pending", "pendente"]).limit(5000)
      : Promise.resolve({ data: [] }),
    cfg.protecao.contatoRecenteDias > 0
      ? db.from("calendario_tarefas").select("contact_id").eq("estabelecimento_id", estab).eq("origem", "envio_massa").gte("created_at", recente).limit(5000)
      : Promise.resolve({ data: [] }),
    db.from("potenciais_dispensas").select("customer_id").eq("estabelecimento_id", estab).gte("ate", hoje).limit(5000),
  ]);
  const bloqueados = new Set<string>([...(t.data ?? []), ...(r.data ?? [])].map((x: any) => x.contact_id).filter(Boolean));
  for (const x of d.data ?? []) bloqueados.add(x.customer_id);
  const nomes = new Map<string, string>();
  const orcs: OrcPotencial[] = (o.data ?? []).filter((x: any) => x.cliente_id && ids.has(x.cliente_id)).map((x: any) => ({
    clienteId: x.cliente_id, etapa: x.etapa, criado: x.created_at, valor: Number(x.valor_total) || 0,
    itens: (x.orcamento_itens ?? []).filter((i: any) => i.produto_id).map((i: any) => {
      if (i.produtos?.nome) nomes.set(i.produto_id, i.produtos.nome);
      return { produtoId: i.produto_id, categoriaId: i.produtos?.categoria_id ?? null };
    }),
  }));
  for (const p of cfg.acaoComercial.produtos) nomes.set(p.id, p.nome);
  return calcularPotenciais(orcs, cfg, Date.now(), bloqueados, nomes);
}
