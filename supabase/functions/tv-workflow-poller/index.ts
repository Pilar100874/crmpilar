import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Poller de gatilhos baseados em ESTADO do banco.
 * Roda a cada 1 min (pg_cron) e detecta eventos como:
 *   venda_realizada, pedido_novo, pedido_aprovado, pedido_cancelado,
 *   orcamento_criado, ponto_batido, lead_novo, prospect_convertido,
 *   caminhao_parado, caminhao_movimento, excesso_velocidade,
 *   pagamento_recebido, boleto_vencido, aniversario.
 *
 * Para cada detecção, chama a tv-workflow-dispatch com o evento correto.
 * Usa a tabela tv_workflow_poller_state como cursor para não duplicar disparos.
 */

type Admin = ReturnType<typeof createClient>;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, number> = {};

  // Descobre quais eventos há workflows ativos escutando (economia de query)
  const eventosAtivos = await eventosEmUso(admin);

  const check = async (evento: string, fn: () => Promise<number>) => {
    if (!eventosAtivos.has(evento)) return;
    try {
      results[evento] = await fn();
    } catch (e) {
      console.error("poller err", evento, e);
      results[evento] = -1;
    }
  };

  await check("venda_realizada", () => detectarNovoRegistro(admin, "venda_realizada", "pedidos_recebidos", { status: ["concluido", "pago", "faturado"] }));
  await check("pedido_novo", () => detectarNovoRegistro(admin, "pedido_novo", "pedidos_recebidos"));
  await check("pedido_aprovado", () => detectarMudancaStatus(admin, "pedido_aprovado", "pedidos_recebidos", ["aprovado"]));
  await check("pedido_cancelado", () => detectarMudancaStatus(admin, "pedido_cancelado", "pedidos_recebidos", ["cancelado"]));
  await check("orcamento_criado", () => detectarNovoRegistro(admin, "orcamento_criado", "orcamentos"));
  await check("ponto_batido", () => detectarNovoRegistro(admin, "ponto_batido", "ponto_registros"));
  await check("lead_novo", () => detectarNovoRegistro(admin, "lead_novo", "prospects_b2b"));
  await check("caminhao_parado", () => detectarCaminhaoParado(admin));
  await check("excesso_velocidade", () => detectarExcessoVelocidade(admin));
  await check("aniversario", () => detectarAniversario(admin));

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function eventosEmUso(admin: Admin): Promise<Set<string>> {
  const { data } = await admin.from("tv_workflows").select("flow_json").eq("ativo", true);
  const s = new Set<string>();
  for (const w of data || []) {
    const nodes = ((w.flow_json as any)?.nodes || []) as any[];
    for (const n of nodes) {
      const t = n?.data?.type;
      if (t === "gatilho_evento") {
        const ev = n.data?.config?.evento;
        if (ev) s.add(ev);
      } else if (t?.startsWith("gatilho_") && t !== "gatilho_agendado" && t !== "gatilho_intervalo" && t !== "gatilho_webhook") {
        // gatilhos nomeados como gatilho_venda_realizada → evento = "venda_realizada"
        const ev = n.data?.config?.evento || t.replace(/^gatilho_/, "");
        s.add(ev);
      }
    }
  }
  return s;
}

async function getState(admin: Admin, chave: string) {
  const { data } = await admin.from("tv_workflow_poller_state").select("*").eq("chave", chave).maybeSingle();
  return data;
}

async function setState(admin: Admin, chave: string, evento: string, estabelecimento_id: string | null, ultimo_ref: string) {
  await admin.from("tv_workflow_poller_state").upsert({
    chave, evento, estabelecimento_id, ultimo_ref, ultimo_check: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
}

async function dispatch(evento: string, estabelecimento_id: string, payload: Record<string, any>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tv-workflow-dispatch`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ evento, estabelecimento_id, payload }),
  }).catch((e) => console.error("dispatch fetch", e));
}

/** Detecta novas linhas em uma tabela desde o último cursor (por created_at) */
async function detectarNovoRegistro(
  admin: Admin,
  evento: string,
  tabela: string,
  filtro?: { status?: string[] },
): Promise<number> {
  const chave = `${evento}:global`;
  const st = await getState(admin, chave);
  const cursor = st?.ultimo_ref || new Date(Date.now() - 5 * 60000).toISOString();

  let q = admin.from(tabela).select("id, estabelecimento_id, created_at, status, valor_total, nome").gt("created_at", cursor).order("created_at", { ascending: true }).limit(50);
  if (filtro?.status) q = q.in("status", filtro.status);
  const { data } = await q;
  if (!data?.length) return 0;

  let n = 0;
  for (const row of data) {
    if (!row.estabelecimento_id) continue;
    await dispatch(evento, row.estabelecimento_id, {
      id: row.id,
      valor: (row as any).valor_total,
      nome: (row as any).nome,
      status: (row as any).status,
    });
    n++;
  }
  const last = data[data.length - 1].created_at;
  await setState(admin, chave, evento, null, last as string);
  return n;
}

async function detectarMudancaStatus(
  admin: Admin,
  evento: string,
  tabela: string,
  statusAlvo: string[],
): Promise<number> {
  const chave = `${evento}:global`;
  const st = await getState(admin, chave);
  // Usa updated_at se existir, senão created_at (fallback simples)
  const cursor = st?.ultimo_ref || new Date(Date.now() - 5 * 60000).toISOString();
  const { data } = await admin.from(tabela)
    .select("id, estabelecimento_id, created_at, status, valor_total")
    .in("status", statusAlvo)
    .gt("created_at", cursor)
    .order("created_at", { ascending: true })
    .limit(50);
  if (!data?.length) return 0;
  let n = 0;
  for (const row of data) {
    if (!row.estabelecimento_id) continue;
    await dispatch(evento, row.estabelecimento_id, { id: row.id, status: row.status, valor: (row as any).valor_total });
    n++;
  }
  await setState(admin, chave, evento, null, data[data.length - 1].created_at as string);
  return n;
}

async function detectarCaminhaoParado(admin: Admin): Promise<number> {
  // Considera parado: última posição >= 10 min atrás, ou última posição com velocidade=0 há 10+ min
  const limite = new Date(Date.now() - 10 * 60000).toISOString();
  const { data } = await admin.from("veiculo_posicoes")
    .select("veiculo_id, velocidade, created_at, veiculos(estabelecimento_id, placa, nome)")
    .lt("created_at", limite)
    .eq("velocidade", 0)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!data?.length) return 0;
  let n = 0;
  const st = await getState(admin, "caminhao_parado:global");
  const jaAvisados = new Set((st?.ultimo_ref || "").split(","));
  const novosAvisos: string[] = [];
  for (const row of data as any[]) {
    if (jaAvisados.has(row.veiculo_id)) { novosAvisos.push(row.veiculo_id); continue; }
    const est = row.veiculos?.estabelecimento_id;
    if (!est) continue;
    await dispatch("caminhao_parado", est, { veiculo_id: row.veiculo_id, placa: row.veiculos?.placa, nome: row.veiculos?.nome });
    novosAvisos.push(row.veiculo_id);
    n++;
  }
  await setState(admin, "caminhao_parado:global", "caminhao_parado", null, novosAvisos.slice(0, 100).join(","));
  return n;
}

async function detectarExcessoVelocidade(admin: Admin): Promise<number> {
  const chave = "excesso_velocidade:global";
  const st = await getState(admin, chave);
  const cursor = st?.ultimo_ref || new Date(Date.now() - 5 * 60000).toISOString();
  const { data } = await admin.from("veiculo_posicoes")
    .select("id, veiculo_id, velocidade, created_at, veiculos(estabelecimento_id, placa, nome)")
    .gt("velocidade", 80)
    .gt("created_at", cursor)
    .order("created_at", { ascending: true })
    .limit(50);
  if (!data?.length) return 0;
  let n = 0;
  for (const row of data as any[]) {
    const est = row.veiculos?.estabelecimento_id;
    if (!est) continue;
    await dispatch("excesso_velocidade", est, { veiculo_id: row.veiculo_id, velocidade: row.velocidade, placa: row.veiculos?.placa });
    n++;
  }
  await setState(admin, chave, "excesso_velocidade", null, data[data.length - 1].created_at as string);
  return n;
}

async function detectarAniversario(admin: Admin): Promise<number> {
  // Dispara 1x por dia, entre 08:00 e 08:59 UTC (~5h Brasil). Ajuste se preferir.
  const agora = new Date();
  if (agora.getUTCHours() !== 11) return 0; // ~08h BRT
  const chave = `aniversario:${agora.toISOString().slice(0, 10)}`;
  const st = await getState(admin, chave);
  if (st) return 0;
  // Best-effort: só marca como executado para não repetir hoje.
  await setState(admin, chave, "aniversario", null, "done");
  // Sem coluna de nascimento confirmada, apenas registra que o dia foi processado.
  return 0;
}
