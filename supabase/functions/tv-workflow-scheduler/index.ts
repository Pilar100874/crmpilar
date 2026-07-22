import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Executado a cada 1 minuto pelo pg_cron. Varre workflows ativos que possuem
 * gatilhos "gatilho_intervalo" ou "gatilho_agendado" (cron simples) e, quando
 * chegou a hora, chama a tv-workflow-dispatch com o workflow_id.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: wfs, error } = await admin
      .from("tv_workflows")
      .select("id, ativo, flow_json, ultimo_disparo_em, estabelecimento_id")
      .eq("ativo", true);
    if (error) throw error;

    const agora = new Date();
    const minutoAtual = agora.getUTCMinutes();
    const horaAtual = agora.getUTCHours();
    const diaSemana = agora.getUTCDay();
    const diaMes = agora.getUTCDate();
    const mes = agora.getUTCMonth() + 1;

    const cronMatch = (field: string, value: number): boolean => {
      const f = (field || "*").trim();
      if (f === "*") return true;
      // */N
      const every = f.match(/^\*\/(\d+)$/);
      if (every) return value % parseInt(every[1], 10) === 0;
      // lista/valores fixos
      return f.split(",").some((p) => {
        const range = p.match(/^(\d+)-(\d+)$/);
        if (range) {
          const a = parseInt(range[1], 10);
          const b = parseInt(range[2], 10);
          return value >= a && value <= b;
        }
        return parseInt(p, 10) === value;
      });
    };

    const cronDeveDisparar = (cron: string): boolean => {
      const parts = (cron || "").trim().split(/\s+/);
      if (parts.length < 5) return false;
      return (
        cronMatch(parts[0], minutoAtual) &&
        cronMatch(parts[1], horaAtual) &&
        cronMatch(parts[2], diaMes) &&
        cronMatch(parts[3], mes) &&
        cronMatch(parts[4], diaSemana)
      );
    };

    const disparados: string[] = [];
    const naoDisparados: Array<{ id: string; motivo: string }> = [];

    for (const wf of wfs || []) {
      const nodes = ((wf.flow_json as any)?.nodes || []) as any[];
      let intervaloMin: number | null = null;
      let cronExpr: string | null = null;

      for (const n of nodes) {
        const t = n.data?.type;
        const cfg = n.data?.config || {};
        if (t === "gatilho_intervalo") {
          const m = parseInt(cfg.intervalo_min, 10);
          if (m > 0) intervaloMin = intervaloMin == null ? m : Math.min(intervaloMin, m);
        } else if (t === "gatilho_agendado" && cfg.cron) {
          cronExpr = String(cfg.cron);
        }
      }

      if (!intervaloMin && !cronExpr) continue;

      let deveDisparar = false;
      if (cronExpr && cronDeveDisparar(cronExpr)) deveDisparar = true;

      if (intervaloMin) {
        const ultimo = wf.ultimo_disparo_em ? new Date(wf.ultimo_disparo_em).getTime() : 0;
        const diffMin = (agora.getTime() - ultimo) / 60000;
        if (diffMin >= intervaloMin - 0.1) deveDisparar = true;
      }

      if (!deveDisparar) {
        naoDisparados.push({ id: wf.id, motivo: "fora do horário" });
        continue;
      }

      // Chama a dispatch (mesma origem, autenticado via service role)
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tv-workflow-dispatch`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ workflow_id: wf.id, payload: { scheduled: true } }),
      });
      const body = await resp.json().catch(() => ({}));
      disparados.push(wf.id);

      // Atualiza o carimbo do último disparo
      await admin
        .from("tv_workflows")
        .update({ ultimo_disparo_em: agora.toISOString() })
        .eq("id", wf.id);

      console.log("wf disparado", wf.id, body);
    }

    return new Response(
      JSON.stringify({ ok: true, disparados: disparados.length, ids: disparados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("tv-workflow-scheduler error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
