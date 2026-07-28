import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Poller de Marketing:
 *  - Dispara campaigns com schedule_at vencido e status 'agendada'
 *  - Executa marketing_automations ativas via marketing-automation-execute
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resultado = { campanhas: 0, automacoes: 0, erros: [] as string[] };

  try {
    const agora = new Date().toISOString();
    const { data: campanhas } = await admin
      .from("campaigns")
      .select("id, estabelecimento_id, schedule_at, status")
      .lte("schedule_at", agora)
      .in("status", ["agendada", "scheduled", "pendente"])
      .limit(100);

    for (const c of campanhas ?? []) {
      await admin.from("campaigns").update({ status: "processando" }).eq("id", c.id);
      try {
        await admin.functions.invoke("marketing-automation-execute", {
          body: { campaign_id: c.id, estabelecimento_id: c.estabelecimento_id },
        });
        await admin.from("campaigns").update({ status: "enviada" }).eq("id", c.id);
        resultado.campanhas++;
      } catch (e: any) {
        await admin.from("campaigns").update({ status: "erro" }).eq("id", c.id);
        resultado.erros.push(`campaign:${c.id}:${e.message}`);
      }
    }

    // NOTA: a execução periódica de marketing_automations é feita pelo cron
    // dedicado "marketing-automation-scheduler-every-minute". NÃO invocar aqui
    // para evitar disparo duplicado (o poller rodava a cada 5 min e chamava
    // o scheduler N vezes, competindo com o cron do próprio scheduler).

    await admin.from("cron_health").upsert({
      poller: "marketing-poller",
      ultimo_run_em: new Date().toISOString(),
      ultimo_status: resultado.erros.length ? "erro" : "ok",
      ultimo_detalhes: resultado,
    }, { onConflict: "poller" });

    return new Response(JSON.stringify({ success: true, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("marketing-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
