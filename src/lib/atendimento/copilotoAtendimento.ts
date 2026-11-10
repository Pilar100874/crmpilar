import { supabase } from "@/integrations/supabase/client";
import type { Potencial } from "./potenciais";

const db = supabase as any;
const DIA = 86_400_000;

// ---------------- Urgência dos recebidos ----------------
export type NivelUrgencia = "reclamacao" | "cotacao" | "duvida";
export const URGENCIA: Record<NivelUrgencia, { rotulo: string; peso: number }> = {
  reclamacao: { rotulo: "Reclamação", peso: 3 },
  cotacao: { rotulo: "Pedido / cotação", peso: 2 },
  duvida: { rotulo: "Dúvida", peso: 1 },
};

const sem = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PALAVRAS: [NivelUrgencia, RegExp][] = [
  ["reclamacao", /\b(reclama\w*|problema|defeit\w*|errad\w*|atras\w*|nao chegou|faltou|falta\w*|quebrad\w*|amassad\w*|danificad\w*|insatisfeit\w*|absurdo|cancelar|devol\w*|pessim\w*)\b/],
  ["cotacao", /\b(orcamento|cotacao|cotar|pedido|comprar|preco|quanto custa|valor|tabela|proposta|fechar|quero|preciso de)\b/],
  ["duvida", /\b(duvida|prazo|entrega|quando|como|qual|horario|onde|\?)/],
];

/** Classifica o texto recebido; reclamação tem prioridade sobre cotação, que tem sobre dúvida. */
export function classificarUrgencia(texto?: string | null): NivelUrgencia | null {
  if (!texto?.trim()) return null;
  const t = sem(texto);
  for (const [nivel, re] of PALAVRAS) if (re.test(t) || (nivel === "duvida" && t.includes("?"))) return nivel;
  return null;
}

// ---------------- Próximo cliente (modo foco) ----------------
/** Próximo da lista já ordenada depois do atual; sem atual, o primeiro. Nunca devolve o próprio atual. */
export function proximoDaFila<T extends { id: string }>(lista: T[], atualId?: string | null): T | null {
  if (!lista.length) return null;
  const i = atualId ? lista.findIndex((x) => x.id === atualId) : -1;
  if (i < 0) return lista[0];
  return lista[i + 1] ?? null;
}

// ---------------- Histórico de clientes abertos (voltar / avançar) ----------------
export type HistoricoFila = { lista: string[]; i: number };

export const HISTORICO_VAZIO: HistoricoFila = { lista: [], i: -1 };

/**
 * Registra o cliente que acabou de abrir. Se ele já estava no histórico (a pessoa
 * voltou atrás), só move o ponteiro: nada é duplicado. Se abriu um cliente novo
 * depois de ter voltado, o trecho "à frente" do ponteiro é descartado.
 */
export function registrarVisita(h: HistoricoFila, id: string | null): HistoricoFila {
  if (!id) return h;
  if (h.lista[h.i] === id) return h;
  const ja = h.lista.lastIndexOf(id);
  if (ja >= 0 && ja <= h.i) return { lista: h.lista, i: ja };
  const base = h.lista.slice(0, h.i + 1);
  return { lista: [...base, id], i: base.length };
}

/** Cliente ao lado do atual no histórico: -1 = anterior, +1 = avançar. Null se não houver. */
export function vizinhoDoHistorico(h: HistoricoFila, direcao: -1 | 1): string | null {
  const alvo = h.i + direcao;
  if (alvo < 0 || alvo >= h.lista.length) return null;
  return h.lista[alvo];
}

// ---------------- Termômetro da carteira ----------------
export function termometroCarteira(pots: Potencial[]) {
  const risco = pots.filter((p) => p.tipo === "queda_volume" || p.tipo === "inativo").length;
  const reposicao = pots.filter((p) => p.tipo === "recompra").length;
  const orcamentos = pots.filter((p) => p.tipo === "orcamento").length;
  return { risco, reposicao, orcamentos, total: pots.length };
}

// ---------------- Selo de crédito ----------------
export type SituacaoCredito = "liberado" | "a_vencer" | "bloqueado" | "nao_informado";
export const SELO_CREDITO: Record<SituacaoCredito, { rotulo: string; classe: string }> = {
  liberado: { rotulo: "Crédito liberado", classe: "bg-success/10 text-success border-success/40" },
  a_vencer: { rotulo: "Boleto a vencer", classe: "bg-warning/10 text-warning border-warning/40" },
  bloqueado: { rotulo: "Bloqueado no financeiro", classe: "bg-destructive/10 text-destructive border-destructive/40" },
  nao_informado: { rotulo: "Crédito não informado", classe: "bg-muted text-muted-foreground border-border" },
};

export async function salvarSituacaoCredito(empresaId: string, situacao: SituacaoCredito) {
  const { error } = await db.from("empresas").update({ situacao_credito: situacao }).eq("id", empresaId);
  if (error) throw error;
}

// ---------------- Régua de follow-up de orçamentos ----------------
export interface OrcRegua { id: string; clienteId: string; etapa: string; enviado: string; valor: number; vendedorId?: string | null }
export interface PassoRegua { orcamentoId: string; clienteId: string; passo: "D2" | "D5"; canal: "whatsapp" | "email"; motivo: string; vendedorId?: string | null }

const ABERTOS = ["orcamento", "negociacao", "aprovacao_gerencia"];

/**
 * D+2 → WhatsApp, D+5 → e-mail, apenas para orçamentos abertos.
 * Para quando o cliente respondeu depois do envio (respondeuApos) ou o passo já foi gerado.
 */
export function planejarRegua(orcs: OrcRegua[], hoje: number, respondeuApos: Map<string, number>, jaGerados: Set<string>): PassoRegua[] {
  const out: PassoRegua[] = [];
  for (const o of orcs) {
    if (!ABERTOS.includes(o.etapa)) continue;
    const t = Date.parse(o.enviado); if (!Number.isFinite(t)) continue;
    const resp = respondeuApos.get(o.clienteId);
    if (resp && resp > t) continue;
    const dias = Math.floor((hoje - t) / DIA);
    const valor = o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    const passo: "D2" | "D5" | null = dias >= 5 ? "D5" : dias >= 2 ? "D2" : null;
    if (!passo || dias > 15) continue;
    if (jaGerados.has(`${o.id}:${passo}`)) continue;
    out.push({
      orcamentoId: o.id, clienteId: o.clienteId, passo, canal: passo === "D2" ? "whatsapp" : "email", vendedorId: o.vendedorId,
      motivo: `Follow-up ${passo === "D2" ? "D+2" : "D+5"}: orçamento de ${valor} enviado há ${dias} dias sem resposta`,
    });
  }
  return out;
}

export const MENSAGEM_REGUA: Record<"D2" | "D5", (nome: string) => string> = {
  D2: (n) => `Olá ${n}, tudo bem? Conseguiu dar uma olhada na proposta que enviamos? Fico à disposição para qualquer ajuste.`,
  D5: (n) => `Olá ${n}, passando para saber se a proposta atende. Se precisar, ajustamos quantidades ou condições para você.`,
};

/** Executa a régua uma vez por dia: cria as tarefas de follow-up com a mensagem pronta. */
export async function executarReguaOrcamentos(estab: string, usuarioId: string) {
  const chave = `regua-orc:${estab}:${new Date().toISOString().slice(0, 10)}`;
  if (localStorage.getItem(chave)) return 0;
  localStorage.setItem(chave, "1");
  const desde = new Date(Date.now() - 16 * DIA).toISOString();
  const { data: orcs } = await db.from("orcamentos").select("id, cliente_id, etapa, data_envio, created_at, valor_total, vendedor_id")
    .eq("estabelecimento_id", estab).in("etapa", ABERTOS).gte("created_at", desde).not("cliente_id", "is", null).limit(1000);
  const lista: OrcRegua[] = (orcs ?? []).map((o: any) => ({ id: o.id, clienteId: o.cliente_id, etapa: o.etapa, enviado: o.data_envio || o.created_at, valor: Number(o.valor_total) || 0, vendedorId: o.vendedor_id }));
  if (!lista.length) return 0;
  const ids = [...new Set(lista.map((o) => o.clienteId))];
  const [{ data: tarefas }, { data: convs }] = await Promise.all([
    db.from("calendario_tarefas").select("origem_sub_item, description").eq("estabelecimento_id", estab).like("origem_sub_item", "regua_orc:%").gte("created_at", desde),
    db.from("conversations").select("customer_id, sla_ultima_resposta_cliente_at").in("customer_id", ids),
  ]);
  const ja = new Set<string>((tarefas ?? []).map((t: any) => String(t.origem_sub_item).slice("regua_orc:".length)));
  const resp = new Map<string, number>();
  for (const c of convs ?? []) { const t = Date.parse(c.sla_ultima_resposta_cliente_at || ""); if (Number.isFinite(t)) resp.set(c.customer_id, Math.max(t, resp.get(c.customer_id) ?? 0)); }
  const plano = planejarRegua(lista, Date.now(), resp, ja);
  if (!plano.length) return 0;
  const { data: nomes } = await db.from("customers").select("id, nome").in("id", plano.map((p) => p.clienteId));
  const nome = new Map((nomes ?? []).map((c: any) => [c.id, c.nome]));
  const hoje = new Date().toISOString().slice(0, 10);
  const linhas = plano.filter((p) => nome.has(p.clienteId)).map((p) => ({
    user_id: p.vendedorId || usuarioId, estabelecimento_id: estab, contact_id: p.clienteId, contact_name: nome.get(p.clienteId),
    title: `Follow-up orçamento (${p.canal === "whatsapp" ? "WhatsApp" : "E-mail"}) - ${nome.get(p.clienteId)}`,
    description: `${p.motivo}\n\nMensagem sugerida:\n${MENSAGEM_REGUA[p.passo](String(nome.get(p.clienteId)).split(" ")[0])}`,
    date: hoje, status: "pending", is_all_day: true, origem: "automatico",
    origem_sub_item: `regua_orc:${p.orcamentoId}:${p.passo}`, modo_criacao: "automatico", motivo: p.motivo,
  }));
  if (linhas.length) await db.from("calendario_tarefas").insert(linhas);
  return linhas.length;
}

// ---------------- Pedido repetido ----------------
/** Cria um novo orçamento com os mesmos itens do último pedido finalizado do cliente. */
export async function repetirUltimoPedido(clienteId: string, vendedorId?: string | null, validarCadastro?: (clienteId: string, empresaId: string | null) => Promise<boolean>): Promise<string | null> {
  const { data: ult } = await db.from("orcamentos").select("*, orcamento_itens(*)").eq("cliente_id", clienteId)
    .eq("etapa", "finalizado").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!ult) return null;
  if (validarCadastro && !(await validarCadastro(clienteId, ult.empresa_id))) return null;
  const { data: novo, error } = await db.from("orcamentos").insert({
    estabelecimento_id: ult.estabelecimento_id, cliente_id: ult.cliente_id, empresa_id: ult.empresa_id, unidade_id: ult.unidade_id,
    vendedor_id: vendedorId || ult.vendedor_id, condicao_pagamento_id: ult.condicao_pagamento_id, etapa: "orcamento", status: ult.status ?? "rascunho",
    valor_total: ult.valor_total, valor_desconto: ult.valor_desconto, percentual_desconto: ult.percentual_desconto,
    observacoes: "Pedido repetido do último pedido", orcamento_origem_id: ult.id, origem: ult.origem,
  }).select("id").single();
  if (error) throw error;
  const itens = (ult.orcamento_itens ?? []).map((i: any) => ({ orcamento_id: novo.id, produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, preco_original: i.preco_original, desconto: i.desconto, subtotal: i.subtotal }));
  if (itens.length) { const r = await db.from("orcamento_itens").insert(itens); if (r.error) throw r.error; }
  return novo.id;
}

// ---------------- Sugestão vinda do resumo da ligação ----------------
export const EVENTO_SUGESTAO_LIGACAO = "atendimento:sugestao-ligacao";
const CHAVE_SUG = "atendimento:sugestoes-ligacao";
export interface SugestaoLigacao { resumo: string; dataRetorno?: string | null; motivo?: string | null }
export function lerSugestaoLigacao(contactId: string): SugestaoLigacao | null {
  try { return JSON.parse(localStorage.getItem(CHAVE_SUG) || "{}")[contactId] ?? null; } catch { return null; }
}
export function salvarSugestaoLigacao(contactId: string, s: SugestaoLigacao) {
  let m: Record<string, SugestaoLigacao> = {};
  try { m = JSON.parse(localStorage.getItem(CHAVE_SUG) || "{}"); } catch { /* */ }
  localStorage.setItem(CHAVE_SUG, JSON.stringify({ ...m, [contactId]: s }));
  window.dispatchEvent(new CustomEvent(EVENTO_SUGESTAO_LIGACAO, { detail: { contactId, ...s } }));
}
export function limparSugestaoLigacao(contactId: string) {
  try { const m = JSON.parse(localStorage.getItem(CHAVE_SUG) || "{}"); delete m[contactId]; localStorage.setItem(CHAVE_SUG, JSON.stringify(m)); } catch { /* */ }
}
