import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/**
 * Recebe pings dos pollers e grava em cron_health.
 * POST { poller: string, status: 'ok'|'erro', detalhes?: object }
 * GET → lista status atual de todos pollers registrados.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "GET") {
      const { data } = await admin.from("cron_health").select("*").order("poller");
      return new Response(JSON.stringify({ pollers: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const { poller, status = "ok", detalhes = {} } = body;
    if (!poller) throw new Error("poller obrigatório");

    await admin.from("cron_health").upsert({
      poller,
      ultimo_run_em: new Date().toISOString(),
      ultimo_status: status,
      ultimo_detalhes: detalhes,
      total_runs: 1,
    }, { onConflict: "poller", ignoreDuplicates: false });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
