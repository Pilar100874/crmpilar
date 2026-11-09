export interface InfoOrigem {
  modo_criacao?: string | null; motivo?: string | null; origem?: string | null; origem_sub_item?: string | null; created_at?: string | null;
}
export type ModoCriacao = "manual" | "automatico" | "inteligente";

const CANAIS: Record<string, string> = {
  whatsapp: "WhatsApp", email: "E-mail", telefone: "Telefone", ia: "Ligação com IA", chat: "Chat",
  ciclo_compra: "Ciclo de compra", envio_massa: "Disparo em massa", manual: "Manual", inteligente: "Agenda inteligente",
};

/** Explica ao usuário como e por que a tarefa foi agendada (sem inventar motivos). */
export function descreverOrigem(i: InfoOrigem) {
  const modo: ModoCriacao = i.modo_criacao === "inteligente" || i.modo_criacao === "automatico" ? i.modo_criacao : "manual";
  const rotuloModo = { manual: "manual", automatico: "automático", inteligente: "inteligente" }[modo];
  const canal = CANAIS[i.origem_sub_item ?? ""] ?? CANAIS[i.origem ?? ""] ?? (i.origem || "Não informado");
  const motivo = i.motivo?.trim() || (modo === "manual" ? "Criado manualmente pelo usuário" : "Motivo não registrado");
  return { modo, rotuloModo, canal, motivo };
}
