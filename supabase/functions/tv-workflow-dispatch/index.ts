import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Recebe { evento, payload, estabelecimento_id, workflow_id? } e enfileira
 * execuções para todos os dispositivos alvo de cada workflow ativo.
 *
 * Interpreta o `flow_json` (nodes+edges) quando presente; caso contrário,
 * cai no comportamento antigo baseado nos campos flat do workflow.
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
      return json({ error: "evento ou workflow_id é obrigatório" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = admin.from("tv_workflows").select("*").eq("ativo", true);
    if (workflow_id) q = q.eq("id", workflow_id);
    else q = q.eq("evento", evento!);
    if (estabelecimento_id) q = q.eq("estabelecimento_id", estabelecimento_id);

    const { data: workflows, error } = await q;
    if (error) throw error;
    if (!workflows?.length) return json({ ok: true, execucoes: 0 });

    let total = 0;

    for (const wf of workflows) {
      const inseridas = await processarWorkflow(admin, wf, evento, payload);
      total += inseridas;
    }

    return json({ ok: true, execucoes: total });
  } catch (e) {
    console.error("tv-workflow-dispatch error", e);
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function interpolar(tpl: string, vars: Record<string, any>) {
  return (tpl || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "").toString());
}

function compararValor(a: any, op: string, b: any): boolean {
  switch (op) {
    case "=": return String(a) === String(b);
    case "!=": return String(a) !== String(b);
    case ">": return Number(a) > Number(b);
    case "<": return Number(a) < Number(b);
    case "contem": return String(a ?? "").toLowerCase().includes(String(b ?? "").toLowerCase());
    default: return true;
  }
}

function dentroHorario(cfg: any): boolean {
  const agora = new Date();
  const dias: number[] = cfg.dias || [];
  if (dias.length > 0 && !dias.includes(agora.getDay())) return false;
  const [hi, mi] = String(cfg.hora_inicio || "00:00").split(":").map(Number);
  const [hf, mf] = String(cfg.hora_fim || "23:59").split(":").map(Number);
  const cur = agora.getHours() * 60 + agora.getMinutes();
  const ini = hi * 60 + (mi || 0);
  const fim = hf * 60 + (mf || 0);
  return cur >= ini && cur <= fim;
}

async function processarWorkflow(admin: any, wf: any, evento: string | undefined, payload: Record<string, any>) {
  const flow = wf.flow_json || null;

  // Sem flow_json → comportamento legacy (mensagem única)
  if (!flow || !flow.nodes?.length) {
    return await enfileirarBarraLegacy(admin, wf, payload);
  }

  const nodes: any[] = flow.nodes;
  const edges: any[] = flow.edges || [];

  // Filtra gatilhos que casam
  const gatilhos = nodes.filter((n) => {
    const t = n.data?.type;
    if (!t?.startsWith("gatilho_")) return false;
    if (t === "gatilho_evento") {
      const ev = n.data?.config?.evento;
      return !evento || ev === evento || ev === "manual";
    }
    return true;
  });

  if (gatilhos.length === 0) return 0;

  const proximos = (id: string, handle?: string | null) =>
    edges
      .filter((e) => e.source === id && (!handle || !e.sourceHandle || e.sourceHandle === handle))
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean);

  const dispositivosBase = await carregarDispositivos(admin, wf.estabelecimento_id);
  let totalInseridas = 0;

  for (const g of gatilhos) {
    totalInseridas += await percorrer(admin, wf, g, payload, proximos, dispositivosBase);
  }

  return totalInseridas;
}

async function percorrer(
  admin: any,
  wf: any,
  node: any,
  payload: Record<string, any>,
  proximos: (id: string, handle?: string | null) => any[],
  devicesBase: any[],
  escopoAtual?: any,
  duracaoOverride?: number,
): Promise<number> {
  const cfg = node.data?.config || {};
  const t = node.data?.type;
  let inseridas = 0;

  // Bloco de duração: apenas sobrescreve o tempo dos próximos blocos de tela
  if (t === "acao_duracao") {
    const dur = parseInt(cfg.segundos, 10) || 8;
    const filhos = proximos(node.id);
    for (const f of filhos)
      inseridas += await percorrer(admin, wf, f, payload, proximos, devicesBase, escopoAtual, dur);
    return inseridas;
  }



  // Condições: escolhem qual saída seguir
  if (t === "condicao_filtro") {
    const ok = compararValor(payload[cfg.campo], cfg.operador || "=", cfg.valor);
    const filhos = proximos(node.id, ok ? "yes" : "no");
    for (const f of filhos) inseridas += await percorrer(admin, wf, f, payload, proximos, devicesBase, escopoAtual, duracaoOverride);
    return inseridas;
  }
  if (t === "condicao_horario") {
    const ok = dentroHorario(cfg);
    const filhos = proximos(node.id, ok ? "yes" : "no");
    for (const f of filhos) inseridas += await percorrer(admin, wf, f, payload, proximos, devicesBase, escopoAtual, duracaoOverride);
    return inseridas;
  }
  if (t === "condicao_escopo") {
    // aplica filtro sobre os dispositivos que continuarão na cadeia
    const filtrados = filtrarDispositivos(devicesBase, {
      escopo_tipo: cfg.escopo_tipo,
      escopo_ids: cfg.escopo_ids,
      dashboard_id: cfg.dashboard_id,
    });
    const ok = filtrados.length > 0;
    const filhos = proximos(node.id, ok ? "yes" : "no");
    for (const f of filhos) inseridas += await percorrer(admin, wf, f, payload, proximos, filtrados, filtrados, duracaoOverride);
    return inseridas;
  }

  // Ações
  if (t === "acao_barra") {
    const alvos = escopoAtual || devicesBase;
    if (alvos.length > 0) {
      const dur = duracaoOverride ?? cfg.duracao_segundos ?? 8;
      const rows = alvos.map((d: any) => ({
        workflow_id: wf.id,
        device_id: d.id,
        estabelecimento_id: wf.estabelecimento_id,
        mensagem_renderizada: interpolar(cfg.mensagem || "", payload),
        estilo: cfg.estilo || {},
        duracao_segundos: dur,
        expira_em: new Date(Date.now() + dur * 1000).toISOString(),
      }));
      const { error } = await admin.from("tv_workflow_execucoes").insert(rows);
      if (!error) inseridas += rows.length;
    }
  }
  if (t === "acao_comando") {
    const alvos = escopoAtual || devicesBase;
    const rows = alvos.map((d: any) => ({
      device_id: d.id,
      estabelecimento_id: wf.estabelecimento_id,
      tipo: cfg.comando,
      payload: cfg.payload || {},
    }));
    if (rows.length) await admin.from("tv_commands").insert(rows);
  }
  if (t === "acao_trocar_dashboard") {
    const alvos = escopoAtual || devicesBase;
    for (const d of alvos) {
      await admin.from("tv_commands").insert({
        device_id: d.id,
        estabelecimento_id: wf.estabelecimento_id,
        tipo: "atualizar_dashboard",
        payload: { dashboard_id: cfg.dashboard_id },
      });
    }
  }
  if (t === "acao_log") {
    const alvos = escopoAtual || devicesBase;
    const rows = alvos.map((d: any) => ({
      device_id: d.id,
      estabelecimento_id: wf.estabelecimento_id,
      nivel: cfg.nivel || "info",
      tipo: "workflow",
      titulo: cfg.titulo || wf.nome,
      mensagem: interpolar(cfg.mensagem || "", payload),
    }));
    if (rows.length) await admin.from("tv_events").insert(rows).then(() => {}, () => {});
  }
  if (t === "acao_aguardar") {
    const s = Math.min(30, cfg.segundos || 0); // teto de segurança
    if (s > 0) await new Promise((r) => setTimeout(r, s * 1000));
  }

  // Continua para os próximos nós (saída padrão)
  const filhos = proximos(node.id);
  for (const f of filhos) inseridas += await percorrer(admin, wf, f, payload, proximos, devicesBase, escopoAtual, duracaoOverride);
  return inseridas;
}

async function carregarDispositivos(admin: any, estId: string) {
  const { data } = await admin
    .from("tv_devices")
    .select("id,estabelecimento_id,grupo_id,dashboard_atual_id,bloqueado")
    .eq("estabelecimento_id", estId);
  return (data || []).filter((d: any) => !d.bloqueado);
}

function filtrarDispositivos(devs: any[], escopo: { escopo_tipo?: string; escopo_ids?: string[]; dashboard_id?: string | null }) {
  return devs.filter((d) => {
    if (escopo.escopo_tipo === "dispositivos") return (escopo.escopo_ids || []).includes(d.id);
    if (escopo.escopo_tipo === "grupos") return d.grupo_id && (escopo.escopo_ids || []).includes(d.grupo_id);
    if (escopo.escopo_tipo === "dashboard") return escopo.dashboard_id && d.dashboard_atual_id === escopo.dashboard_id;
    return true;
  });
}

// ── Fallback antigo (sem flow_json) ─────────────────────────────
async function enfileirarBarraLegacy(admin: any, wf: any, payload: Record<string, any>) {
  const devs = await carregarDispositivos(admin, wf.estabelecimento_id);
  const alvos = filtrarDispositivos(devs, {
    escopo_tipo: wf.escopo_tipo,
    escopo_ids: wf.escopo_ids,
    dashboard_id: wf.dashboard_id,
  });
  if (!alvos.length) return 0;
  const dur = wf.duracao_segundos || 8;
  const rows = alvos.map((d: any) => ({
    workflow_id: wf.id,
    device_id: d.id,
    estabelecimento_id: wf.estabelecimento_id,
    mensagem_renderizada: interpolar(wf.mensagem_template || "", payload),
    estilo: wf.estilo || {},
    duracao_segundos: dur,
    expira_em: new Date(Date.now() + dur * 1000).toISOString(),
  }));
  const { error } = await admin.from("tv_workflow_execucoes").insert(rows);
  return error ? 0 : rows.length;
}
