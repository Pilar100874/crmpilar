import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { notificarTarefasAlteradas } from "@/lib/calendario/eventos";

/** Tipo de contato gravado no registro, sempre derivado da aba em uso. */
export type CanalAtendimento = "whatsapp" | "email" | "telefone" | "presencial" | "orcamento";

export const ROTULO_CANAL: Record<CanalAtendimento, string> = {
  whatsapp: "Chat",
  email: "E-mail",
  telefone: "Telefone",
  presencial: "Visita",
  orcamento: "Orçamento",
};

/** Canais em que o resumo da conversa é obrigatório. */
export const CANAIS_RESUMO_OBRIGATORIO: CanalAtendimento[] = ["telefone", "presencial"];

export function canalDaAba(aba: string): CanalAtendimento | null {
  if (aba === "chat") return "whatsapp";
  if (aba === "email") return "email";
  if (aba === "tel") return "telefone";
  if (aba === "visita") return "presencial";
  if (aba === "orcamento") return "orcamento";
  return null;
}

const STATUS_PENDENTES = ["pendente", "pending"];
const ORIGENS_VALIDAS = ["bot","campanha","ligacao","visita","email_enviado","email_recebido","pedido_orcamento","pedido_negociacao","pedido_aprovacao"];
const ORIGEM_CANAL: Record<CanalAtendimento, string> = { whatsapp: "bot", email: "email_enviado", telefone: "ligacao", presencial: "visita", orcamento: "pedido_orcamento" };
const origemValida = (o: string | null | undefined, canal: CanalAtendimento) => (o && ORIGENS_VALIDAS.includes(o) ? o : ORIGEM_CANAL[canal]);
const hojeStr = () => format(new Date(), "yyyy-MM-dd");

export interface TarefaFutura {
  id: string;
  date: string;
  title: string;
}

/** Próximo contato já agendado (data depois de hoje) para o cliente. */
export async function buscarProximoContatoFuturo(contactId: string, usuarioId: string): Promise<TarefaFutura | null> {
  const { data } = await supabase
    .from("calendario_tarefas")
    .select("id, date, title")
    .eq("contact_id", contactId)
    .eq("user_id", usuarioId)
    .in("status", STATUS_PENDENTES)
    .gt("date", hojeStr())
    .order("date", { ascending: true })
    .limit(1);
  return (data?.[0] as TarefaFutura) ?? null;
}

interface FinalizarParams {
  contactId: string;
  contactName: string;
  canal: CanalAtendimento;
  observacao?: string;
  flagId?: string | null;
  proximaData: Date;
  usuarioId: string;
  estabelecimentoId: string;
  /** Tarefa do dia que está sendo atendida (quando conhecida). */
  tarefaAtualId?: string | null;
  /** Quando já existe um contato futuro: manter a data antiga ou usar a nova. */
  escolha?: "nova" | "antiga";
}

/**
 * Finaliza o atendimento: registra o contato, conclui a tarefa do dia e
 * garante que exista somente UMA data futura de próximo contato para o cliente.
 */
export async function finalizarAtendimento(p: FinalizarParams) {
  const hoje = hojeStr();
  const obs = p.observacao?.trim() || null;

  // 1) Tarefa do dia (ou atrasada) — cria uma quando o cliente não está na agenda.
  let tarefaId = p.tarefaAtualId ?? null;
  let tarefaTitulo = `Contato - ${p.contactName}`;
  let tarefaOrigem = ORIGEM_CANAL[p.canal];
  let dataOriginal: string | null = hoje;
  if (!tarefaId) {
    const { data } = await supabase
      .from("calendario_tarefas")
      .select("id, title, origem, date, data_original")
      .eq("contact_id", p.contactId)
      .eq("user_id", p.usuarioId)
      .in("status", STATUS_PENDENTES)
      .lte("date", hoje)
      .order("date", { ascending: true })
      .limit(1);
    const t: any = data?.[0];
    if (t) {
      tarefaId = t.id;
      tarefaTitulo = t.title;
      tarefaOrigem = origemValida(t.origem, p.canal);
      dataOriginal = t.data_original || t.date;
    }
  } else {
    const { data: t }: any = await supabase
      .from("calendario_tarefas")
      .select("title, origem, date, data_original")
      .eq("id", tarefaId)
      .maybeSingle();
    if (t) {
      tarefaTitulo = t.title;
      tarefaOrigem = origemValida(t.origem, p.canal);
      dataOriginal = t.data_original || t.date;
    }
  }
  if (!tarefaId) {
    const { data: nova, error } = await supabase
      .from("calendario_tarefas")
      .insert({
        user_id: p.usuarioId,
        estabelecimento_id: p.estabelecimentoId,
        contact_id: p.contactId,
        contact_name: p.contactName,
        title: tarefaTitulo,
        date: hoje,
        origem: tarefaOrigem,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    tarefaId = nova.id;
  }

  const proxima = format(p.proximaData, "yyyy-MM-dd");

  // 2) Registro do atendimento
  const { error: regErr } = await supabase.from("atendimento_registros").insert({
    tarefa_id: tarefaId,
    estabelecimento_id: p.estabelecimentoId,
    usuario_id: p.usuarioId,
    tipo_contato: p.canal,
    flag_id: p.flagId ?? null,
    observacao: obs,
    data_proximo_contato: proxima,
    envio_massa: false,
  });
  if (regErr) throw regErr;

  // 3) Conclui a tarefa atual
  const { error: updErr } = await supabase
    .from("calendario_tarefas")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", tarefaId);
  if (updErr) throw updErr;

  // 4) Garante uma única data futura
  const { data: futuras } = await supabase
    .from("calendario_tarefas")
    .select("id, date")
    .eq("contact_id", p.contactId)
    .eq("user_id", p.usuarioId)
    .in("status", STATUS_PENDENTES)
    .gt("date", hoje)
    .order("date", { ascending: true });

  const lista = (futuras ?? []) as { id: string; date: string }[];
  if (p.escolha === "antiga" && lista.length > 0) {
    const [manter, ...resto] = lista;
    if (resto.length) await supabase.from("calendario_tarefas").delete().in("id", resto.map((r) => r.id));
    void manter;
  } else {
    if (lista.length) await supabase.from("calendario_tarefas").delete().in("id", lista.map((r) => r.id));
    const { error: novaErr } = await supabase.from("calendario_tarefas").insert({
      user_id: p.usuarioId,
      estabelecimento_id: p.estabelecimentoId,
      contact_id: p.contactId,
      contact_name: p.contactName,
      title: tarefaTitulo.startsWith("Retorno:") ? tarefaTitulo : `Retorno: ${tarefaTitulo}`,
      description: `Último contato (${ROTULO_CANAL[p.canal]}): ${format(new Date(), "dd/MM/yyyy")}${obs ? ` - ${obs}` : ""}`,
      date: proxima,
      origem: tarefaOrigem,
      status: "pending",
      data_original: dataOriginal,
    });
    if (novaErr) throw novaErr;
  }

  limparPendencia(p.contactId);
  notificarTarefasAlteradas();
}

/** Tira o cliente do fluxo da agenda, com motivo obrigatório. */
export async function inativarClienteDoFluxo(p: {
  contactId: string;
  motivo: string;
  canal: CanalAtendimento;
  usuarioId: string;
  estabelecimentoId: string;
}) {
  const { error } = await supabase.from("customer_fluxo_inativacoes" as any).insert({
    customer_id: p.contactId,
    usuario_id: p.usuarioId,
    estabelecimento_id: p.estabelecimentoId,
    motivo: p.motivo.trim(),
    canal: p.canal,
  });
  if (error) throw error;
  await supabase
    .from("calendario_tarefas")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("contact_id", p.contactId)
    .eq("user_id", p.usuarioId)
    .in("status", STATUS_PENDENTES);
  limparPendencia(p.contactId);
  notificarTarefasAlteradas();
}

// ---------- Pendências: cliente com interação sem próxima data ----------
const CHAVE_PENDENTES = "atendimento_pendentes_finalizar";
export const EVENTO_PENDENCIAS = "atendimento:pendencias-alteradas";

export function lerPendencias(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PENDENTES) || "[]");
  } catch {
    return [];
  }
}
function salvar(ids: string[]) {
  localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent(EVENTO_PENDENCIAS));
}
export function marcarPendencia(contactId?: string | null) {
  if (!contactId) return;
  const atual = lerPendencias();
  if (!atual.includes(contactId)) salvar([...atual, contactId]);
}
export function limparPendencia(contactId: string) {
  salvar(lerPendencias().filter((id) => id !== contactId));
}

// ---------- Pedido de finalização vindo do cartão ----------
export const EVENTO_FINALIZAR = "atendimento:finalizar-contato";
export function pedirFinalizacao(detalhe: { customerId: string; nome?: string }) {
  window.dispatchEvent(new CustomEvent(EVENTO_FINALIZAR, { detail: detalhe }));
}
