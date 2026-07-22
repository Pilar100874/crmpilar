import { supabase } from "@/integrations/supabase/client";

/**
 * Emite um evento para o motor de workflows de telas remotas.
 * Chame nos pontos-chave do sistema para acionar mensagens/pop-ups nas TVs.
 *
 * Ex:
 *   emitTvEvent("venda_realizada", { valor: 1200, cliente: "ACME" }, estabelecimentoId);
 */
export async function emitTvEvent(
  evento: string,
  payload: Record<string, any> = {},
  estabelecimentoId?: string | null,
) {
  try {
    await supabase.functions.invoke("tv-workflow-dispatch", {
      body: {
        evento,
        payload,
        estabelecimento_id: estabelecimentoId ?? undefined,
      },
    });
  } catch (e) {
    // Falha silenciosa: workflows são complementares, não devem quebrar a UX
    console.warn("emitTvEvent falhou", evento, e);
  }
}

/** Lista dos eventos suportados nativamente pelo builder de workflows. */
export const TV_EVENTOS = [
  "venda_realizada",
  "pedido_novo",
  "pedido_aprovado",
  "pedido_cancelado",
  "orcamento_criado",
  "meta_atingida",
  "meta_perdida",
  "ticket_alto",
  "pagamento_recebido",
  "boleto_vencido",
  "lead_novo",
  "prospect_convertido",
  "atendimento_aberto",
  "saida_veiculo",
  "chegada_veiculo",
  "caminhao_parado",
  "caminhao_movimento",
  "excesso_velocidade",
  "cerca_entrar",
  "cerca_sair",
  "rota_desviada",
  "visita_iniciada",
  "visita_finalizada",
  "estoque_baixo",
  "estoque_zerado",
  "recebimento_mercadoria",
  "alerta_camera",
  "camera_offline",
  "intrusao",
  "reconhecimento_facial",
  "ponto_batido",
  "atraso",
  "falta",
  "aniversario",
  "dispositivo_online",
  "dispositivo_offline",
  "bateria_baixa",
  "temperatura_alta",
  "erro_sistema",
] as const;

export type TvEvento = typeof TV_EVENTOS[number];
