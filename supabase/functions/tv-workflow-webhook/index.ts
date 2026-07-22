import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Webhook público que dispara um workflow de tela remota.
 *
 * Uso:
 *   POST /functions/v1/tv-workflow-webhook/{workflow_id}
 *   Body opcional: JSON com payload usado como variáveis {var}
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const workflowId = parts[parts.length - 1];
    if (!workflowId || !/^[0-9a-f-]{36}$/i.test(workflowId)) {
      return json({ error: "workflow_id inválido na URL" }, 400);
    }
    const payload = await req.json().catch(() => ({}));

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: wf } = await admin.from("tv_workflows").select("id, ativo").eq("id", workflowId).maybeSingle();
    if (!wf) return json({ error: "workflow não encontrado" }, 404);
    if (!wf.ativo) return json({ error: "workflow inativo" }, 400);

    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/tv-workflow-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ workflow_id: workflowId, payload, evento: "webhook" }),
    });
    const data = await resp.json().catch(() => ({}));
    return json({ ok: true, ...data });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
