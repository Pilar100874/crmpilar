import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Endpoint público universal para acionar workflows de qualquer engine.
 *
 * URL:
 *   POST /functions/v1/universal-workflow-webhook/{engine}/{id}
 *
 * engines suportadas:
 *   - tv          → aciona tv-workflow-dispatch
 *   - logistica   → aciona logistica_automacoes (via notificacoes_log)
 *   - vendas      → registra evento em automacoes_vendas_log
 *   - bot         → aciona bot_flows via omnichannel
 *   - marketing   → aciona marketing_automations
 *
 * Corpo (opcional): JSON livre repassado como `event_data`.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    // path: /functions/v1/universal-workflow-webhook/{engine}/{id}
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("universal-workflow-webhook");
    const engine = parts[idx + 1];
    const id = parts[idx + 2];

    if (!engine || !id) {
      return new Response(JSON.stringify({ error: "Formato esperado: /universal-workflow-webhook/{engine}/{id}" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch { /* corpo opcional */ }

    const event_data = { ...payload, received_at: new Date().toISOString(), source: "universal-webhook" };

    let result: any = null;
    switch (engine) {
      case "tv": {
        const r = await admin.functions.invoke("tv-workflow-dispatch", {
          body: { workflow_id: id, event_data, manual: true },
        });
        result = r.data ?? r.error;
        break;
      }
      case "logistica": {
        // Marca disparo em logistica_workflow_state e registra log
        await admin.from("logistica_workflow_state").insert({
          chave: `webhook:logistica:${id}:${Date.now()}`,
          estado: "webhook_recebido",
          payload: event_data,
        }).select();
        result = { engine: "logistica", enqueued: true };
        break;
      }
      case "vendas": {
        await admin.from("automacoes_vendas_log").insert({
          automacao_id: id,
          tipo: "webhook_externo",
          payload: event_data,
        });
        result = { engine: "vendas", enqueued: true };
        break;
      }
      case "bot": {
        const r = await admin.functions.invoke("executar-fluxo-omnichannel", {
          body: { flow_id: id, event_data, trigger: "webhook_externo" },
        });
        result = r.data ?? r.error;
        break;
      }
      case "marketing": {
        // Ativa automação de marketing via log
        await admin.from("marketing_automations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", id);
        result = { engine: "marketing", enqueued: true };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Engine desconhecida: ${engine}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, engine, id, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("universal-workflow-webhook error", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
