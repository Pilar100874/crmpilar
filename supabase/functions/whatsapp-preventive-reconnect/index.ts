// Executa reconexão preventiva das sessões WhatsApp Evolution.
// Roda diariamente via pg_cron. Para cada sessão WORKING com
// auto_reconnect_days > 0 e last_reconnect_at mais antigo que N dias,
// dispara evolution-manager action=restart (força refresh do Baileys).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: sessions, error } = await supabase
    .from("whatsapp_sessions")
    .select("id, session_name, estabelecimento_id, status, auto_reconnect_days, last_reconnect_at")
    .eq("status", "WORKING")
    .gt("auto_reconnect_days", 0);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const results: any[] = [];

  for (const s of sessions || []) {
    const last = s.last_reconnect_at ? new Date(s.last_reconnect_at).getTime() : 0;
    const dueMs = Number(s.auto_reconnect_days) * 24 * 60 * 60 * 1000;
    if (last && now - last < dueMs) continue;

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("evolution-manager", {
        body: {
          action: "restart",
          estabelecimentoId: s.estabelecimento_id,
          sessionId: s.id,
          sessionName: s.session_name,
        },
      });
      await supabase
        .from("whatsapp_sessions")
        .update({ last_reconnect_at: new Date().toISOString() })
        .eq("id", s.id);
      results.push({ session: s.session_name, ok: !fnErr, response: data, error: fnErr?.message });
    } catch (e: any) {
      results.push({ session: s.session_name, ok: false, error: e?.message || String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
