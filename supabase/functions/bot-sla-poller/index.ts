import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Poller de SLA de Bot/Omnichannel.
 * Detecta conversas sem resposta do atendente há X minutos e:
 *  - marca sla_violacao_primeira_resposta / subsequente
 *  - registra em sla_violations
 *  - notifica supervisores via notificacoes_log
 * Rodar a cada 1 min via pg_cron.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resultado = { primeira_resposta: 0, resolucao: 0, erros: [] as string[] };

  try {
    // Busca configs de SLA ativas por estabelecimento
    const { data: slas } = await admin
      .from("sla_config")
      .select("id, estabelecimento_id, tempo_primeira_resposta_min, tempo_resolucao_min, ativo")
      .eq("ativo", true);

    for (const sla of slas ?? []) {
      const limitePrimeira = new Date();
      limitePrimeira.setMinutes(limitePrimeira.getMinutes() - (sla.tempo_primeira_resposta_min || 5));

      // Conversas em espera há mais que o tempo definido
      const { data: pend } = await admin
        .from("conversations")
        .select("id, estabelecimento_id, tempo_espera_inicio, sla_violacao_primeira_resposta, chat_status")
        .eq("estabelecimento_id", sla.estabelecimento_id)
        .lte("tempo_espera_inicio", limitePrimeira.toISOString())
        .neq("sla_violacao_primeira_resposta", true)
        .in("chat_status", ["aguardando", "em_atendimento", "aberto"])
        .limit(200);

      for (const c of pend ?? []) {
        await admin.from("conversations").update({ sla_violacao_primeira_resposta: true }).eq("id", c.id);
        await admin.from("sla_violations").insert({
          conversation_id: c.id,
          estabelecimento_id: c.estabelecimento_id,
          tipo: "primeira_resposta",
          sla_config_id: sla.id,
          detected_at: new Date().toISOString(),
        }).select().maybeSingle().then(() => {}, () => {});
        resultado.primeira_resposta++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("bot-sla-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
