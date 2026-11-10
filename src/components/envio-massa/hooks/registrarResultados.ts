import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import type { CanalEnvio, ContactForBulkSend } from "../types";
import type { ResultadoEnvio } from "./execucaoSequencial";

/** Saves observed outcomes only; does not initiate or repeat external sends. */
export async function iniciarRegistroResultados(canal: CanalEnvio | null, quantidade: number) {
  const [usuarioId, estabelecimentoId] = await Promise.all([getUserIdFromAuth(), getEstabelecimentoId()]);
  if (!usuarioId || !estabelecimentoId) return null;
  const { data, error } = await supabase.from("envio_massa").insert({ usuario_id: usuarioId, estabelecimento_id: estabelecimentoId, nome: "Disparo no Atendimento", status: "enviando", total_contatos: quantidade, conteudo: { canal }, iniciado_em: new Date().toISOString() }).select("id").single();
  return error ? null : data?.id || null;
}
export async function registrarResultadoObservado(envioId: string, contato: ContactForBulkSend, resultado: ResultadoEnvio) {
  const { error } = await supabase.from("envio_massa_contatos").insert({ envio_id: envioId, customer_id: contato.id, status: resultado.status === "erro" ? "erro" : "pendente", resultado_observado: resultado.status, erro_mensagem: resultado.detalhe || null, enviado_em: resultado.status === "encaminhado" ? new Date().toISOString() : null });
  return !error;
}
export async function concluirRegistroResultados(envioId: string, resultados: ResultadoEnvio[]) {
  const { error } = await supabase.from("envio_massa").update({ status: resultados.some(r => r.status === "cancelado") ? "cancelado" : "concluido", contatos_enviados: resultados.filter(r => r.status === "encaminhado").length, contatos_erro: resultados.filter(r => r.status === "erro").length, finalizado_em: new Date().toISOString() }).eq("id", envioId);
  if (error) throw error;
}