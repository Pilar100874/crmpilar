// Processa gatilhos do Mapa de Calor (tempo em tela + carrinho abandonado)
// Roda periodicamente via cron (pg_cron).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const log: any[] = [];

  // Pega todos os gatilhos ativos
  const { data: triggers, error: tErr } = await supabase
    .from("heatmap_triggers")
    .select("*")
    .eq("ativo", true);

  if (tErr) {
    return new Response(JSON.stringify({ error: tErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const trg of triggers || []) {
    try {
      if (trg.tipo === "carrinho_abandonado") {
        const minutos = Number(trg.config?.tempoMinutos ?? 30);
        const valorMin = Number(trg.config?.valorMinimo ?? 0);
        const limite = new Date(Date.now() - minutos * 60_000).toISOString();

        const { data: carts } = await supabase
          .from("ecom_active_carts")
          .select("*")
          .eq("estabelecimento_id", trg.estabelecimento_id)
          .eq("status", "active")
          .gt("item_count", 0)
          .gte("total", valorMin)
          .lt("last_activity_at", limite)
          .is("recovery_triggered_at", null)
          .limit(50);

        for (const cart of carts || []) {
          log.push({ trg: trg.id, cart: cart.id, acao: trg.acao });
          await supabase
            .from("ecom_active_carts")
            .update({
              recovery_triggered_at: new Date().toISOString(),
              status: "abandoned",
            })
            .eq("id", cart.id);
        }

        if ((carts || []).length > 0) {
          await supabase
            .from("heatmap_triggers")
            .update({
              ultima_execucao_at: new Date().toISOString(),
              total_disparos: (trg.total_disparos || 0) + (carts?.length || 0),
            })
            .eq("id", trg.id);
        }
      }

      if (trg.tipo === "tempo_em_tela") {
        const escopo = trg.escopo || trg.config?.escopo || "ecommerce";
        const rota = trg.config?.rota;
        const minutos = Number(trg.config?.tempoMinutos ?? 5);
        const limiteMs = minutos * 60_000;
        const since = new Date(Date.now() - 15 * 60_000).toISOString();

        const tabela = escopo === "sistema" ? "usage_events" : "ecom_usage_events";
        let q = supabase
          .from(tabela)
          .select("*")
          .eq("estabelecimento_id", trg.estabelecimento_id)
          .gte("created_at", since)
          .gte("duration_ms", limiteMs);
        if (rota) q = q.eq("route", rota);
        const { data: events } = await q.limit(50);

        for (const ev of events || []) {
          log.push({ trg: trg.id, ev: ev.id, acao: trg.acao });
        }

        if ((events || []).length > 0) {
          await supabase
            .from("heatmap_triggers")
            .update({
              ultima_execucao_at: new Date().toISOString(),
              total_disparos: (trg.total_disparos || 0) + (events?.length || 0),
            })
            .eq("id", trg.id);
        }
      }
    } catch (e) {
      log.push({ trg: trg.id, error: String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: log.length, log }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
