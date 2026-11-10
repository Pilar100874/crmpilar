import { addMinutes, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { notificarTarefasAlteradas } from "@/lib/calendario/eventos";

export type UrgenciaRecado = "normal" | "urgente";

/** Prazo de retorno do recado: urgente em 30 minutos, normal em 2 horas. */
export const PRAZO_RECADO_MIN: Record<UrgenciaRecado, number> = { normal: 120, urgente: 30 };

export interface Responsavel { id: string; nome: string }

export interface TarefaRecado { origem_sub_item?: string | null; title?: string | null; status?: string | null; user_id?: string | null }
export function recadoPendente(t: TarefaRecado): boolean {
  return (t.origem_sub_item === "recado_urgente" || t.origem_sub_item === "recado_normal" || /^(URGENTE - )?Recado: retornar /i.test(t.title || "")) && !["concluido", "cancelado", "completed", "cancelled"].includes(t.status || "");
}
export function recadoUrgentePendente(t: TarefaRecado): boolean {
  return recadoPendente(t) && (t.origem_sub_item === "recado_urgente" || /^URGENTE - Recado:/i.test(t.title || ""));
}
export function tarefaVisivelNaFila(t: TarefaRecado & { contact_id?: string | null }, vinculados: Set<string>, usuarioId: string): boolean {
  return !!t.contact_id && (vinculados.has(t.contact_id) || (t.user_id === usuarioId && recadoPendente(t)));
}

export interface DadosRecado {
  contatoId: string;
  contatoNome: string;
  responsavelId: string;
  autorId: string;
  autorNome: string;
  recado: string;
  urgencia: UrgenciaRecado;
  estabelecimentoId: string;
  agora?: Date;
}

/** Monta a tarefa de retorno do recado na agenda do responsável (regra pura, testável). */
export function montarTarefaRecado(d: DadosRecado) {
  const texto = d.recado.trim();
  if (!texto) throw new Error("Escreva o recado");
  if (!d.contatoId) throw new Error("Escolha ou cadastre o cliente");
  if (!d.responsavelId) throw new Error("Escolha o responsável");
  const prazo = addMinutes(d.agora ?? new Date(), PRAZO_RECADO_MIN[d.urgencia]);
  const urgente = d.urgencia === "urgente";
  return {
    user_id: d.responsavelId,
    estabelecimento_id: d.estabelecimentoId,
    contact_id: d.contatoId,
    contact_name: d.contatoNome,
    title: `${urgente ? "URGENTE - " : ""}Recado: retornar ${d.contatoNome}`,
    description: `Recado anotado por ${d.autorNome} em ${format(d.agora ?? new Date(), "dd/MM/yyyy HH:mm")}: ${texto}`,
    date: format(prazo, "yyyy-MM-dd"),
    time: format(prazo, "HH:mm"),
    is_all_day: false,
    status: "pending",
    origem: "manual",
    origem_sub_item: urgente ? "recado_urgente" : "recado_normal",
    data_original: format(prazo, "yyyy-MM-dd"),
    modo_criacao: "manual",
    motivo: `Recado encaminhado por ${d.autorNome} para o usuário selecionado`,
  };
}

/** Usuários vinculados ao contato (diretamente ou pela empresa). */
export async function carregarResponsaveis(contatoId: string): Promise<Responsavel[]> {
  const db = supabase as any;
  const [{ data: diretos }, { data: emp }] = await Promise.all([
    db.from("customer_vinculos").select("usuario_id").eq("customer_id", contatoId),
    db.from("customer_empresas").select("empresa_id").eq("customer_id", contatoId),
  ]);
  const ids = new Set<string>((diretos ?? []).map((v: any) => v.usuario_id).filter(Boolean));
  const empresas = (emp ?? []).map((e: any) => e.empresa_id).filter(Boolean);
  if (empresas.length) {
    const { data: ev } = await db.from("empresa_vinculos").select("usuario_id").in("empresa_id", empresas);
    (ev ?? []).forEach((v: any) => v.usuario_id && ids.add(v.usuario_id));
  }
  if (!ids.size) return [];
  const { data: us } = await db.from("usuarios").select("id, nome").in("id", [...ids]);
  return ((us ?? []) as Responsavel[]).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}

export async function listarUsuarios(): Promise<Responsavel[]> {
  const estab = await getEstabelecimentoId();
  const { data } = await (supabase as any).from("usuarios").select("id, nome").eq("estabelecimento_id", estab).order("nome");
  return (data ?? []) as Responsavel[];
}

export async function registrarRecado(p: { contatoId: string; contatoNome: string; responsavelId: string; recado: string; urgencia: UrgenciaRecado }) {
  const [autorId, estab] = await Promise.all([getUserIdFromAuth(), getEstabelecimentoId()]);
  if (!autorId || !estab) throw new Error("Usuário não identificado");
  const { data: destinatario, error: erroDestinatario } = await supabase.from("usuarios").select("id").eq("id", p.responsavelId).eq("estabelecimento_id", estab).maybeSingle();
  if (erroDestinatario || !destinatario) throw new Error("Escolha um usuário da sua empresa");
  const { data: autor } = await (supabase as any).from("usuarios").select("nome").eq("id", autorId).maybeSingle();
  const linha = montarTarefaRecado({ ...p, autorId, autorNome: autor?.nome || "atendente", estabelecimentoId: estab });
  const { error } = await (supabase as any).from("calendario_tarefas").insert(linha);
  if (error) throw error;
  notificarTarefasAlteradas();
  return linha;
}
