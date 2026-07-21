import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Recebe { evento, payload, estabelecimento_id } e enfileira execuções
 * para todos os dispositivos alvo de cada workflow ativo que casa com o evento.
 *
 * payload pode conter variáveis usadas na mensagem_template (ex.: {placa}, {valor}).
 * Se `workflow_id` for informado, força o disparo apenas daquele workflow (modo manual).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      evento,
      payload = {},
      estabelecimento_id,
      workflow_id,
    }: {
      evento?: string;
      payload?: Record<string, any>;
      estabelecimento_id?: string;
      workflow_id?: string;
    } = body;

    if (!evento && !workflow_id) {
      return new Response(JSON.stringify({ error: "evento ou workflow_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca workflows ativos correspondentes
    let query = admin.from("tv_workflows").select("*").eq("ativo", true);
    if (workflow_id) query = query.eq("id", workflow_id);
    else query = query.eq("evento", evento!);
    if (estabelecimento_id) query = query.eq("estabelecimento_id", estabelecimento_id);

    const { data: workflows, error: wfErr } = await query;
    if (wfErr) throw wfErr;
    if (!workflows || workflows.length === 0) {
      return new Response(JSON.stringify({ ok: true, execucoes: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const interpolar = (tpl: string, vars: Record<string, any>) =>
      tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "").toString());

    let totalInseridas = 0;

    for (const wf of workflows) {
      // Filtros (simples: chave/valor exato ou array com contains)
      const filtros = wf.filtros || {};
      let match = true;
      for (const [k, v] of Object.entries(filtros)) {
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
        const pv = payload[k];
        if (Array.isArray(v)) {
          if (!v.includes(pv)) { match = false; break; }
        } else if (k.endsWith("_min")) {
          const base = k.replace(/_min$/, "");
          if (Number(payload[base]) < Number(v)) { match = false; break; }
        } else if (pv !== v) {
          match = false; break;
        }
      }
      if (!match) continue;

      // Resolve dispositivos alvo
      let devQ = admin
        .from("tv_devices")
        .select("id,estabelecimento_id,grupo_id,dashboard_atual_id,bloqueado")
        .eq("estabelecimento_id", wf.estabelecimento_id);

      const { data: devs } = await devQ;
      if (!devs) continue;

      const alvos = devs.filter((d: any) => {
        if (d.bloqueado) return false;
        if (wf.escopo_tipo === "dispositivos") {
          return (wf.escopo_ids || []).includes(d.id);
        }
        if (wf.escopo_tipo === "grupos") {
          return d.grupo_id && (wf.escopo_ids || []).includes(d.grupo_id);
        }
        if (wf.escopo_tipo === "dashboard") {
          return wf.dashboard_id && d.dashboard_atual_id === wf.dashboard_id;
        }
        return true; // 'todos'
      });

      if (alvos.length === 0) continue;

      const msg = interpolar(wf.mensagem_template, payload);
      const duracao = wf.duracao_segundos || 8;
      const expira = new Date(Date.now() + duracao * 1000).toISOString();

      const rows = alvos.map((d: any) => ({
        workflow_id: wf.id,
        device_id: d.id,
        estabelecimento_id: wf.estabelecimento_id,
        mensagem_renderizada: msg,
        estilo: wf.estilo || {},
        duracao_segundos: duracao,
        expira_em: expira,
      }));

      const { error: insErr } = await admin.from("tv_workflow_execucoes").insert(rows);
      if (!insErr) totalInseridas += rows.length;
    }

    return new Response(JSON.stringify({ ok: true, execucoes: totalInseridas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tv-workflow-dispatch error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
