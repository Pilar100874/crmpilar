import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { proximaExecucao } from "../_shared/cron.ts";

/**
 * Agendador de Rotinas da Plataforma de Agentes IA.
 *
 * Dois modos:
 *  - Automático (pg_cron, 1x por minuto): dispara todas as rotinas vencidas.
 *  - Manual: `{ rotina_id }` com JWT do usuário → executa uma rotina agora.
 *
 * Alvos suportados:
 *  - workflow    → chama internamente `aip-execute-workflow`
 *  - agente      → Claude Agent SDK (runner) usando o prompt do agente
 *  - claude_code → Claude Agent SDK (runner) com o prompt livre da rotina
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RUNNER_URL = Deno.env.get("AIP_RUNNER_URL");
const RUNNER_KEY = Deno.env.get("AIP_RUNNER_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY);

/** Executa um workflow chamando o motor com credencial interna. */
async function rodarWorkflow(rotina: any): Promise<{ execution_id: string | null; resposta: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/aip-execute-workflow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-aip-internal": "1",
    },
    body: JSON.stringify({
      workflow_id: rotina.workflow_id,
      input: { ...(rotina.input ?? {}), conectores: rotina.conectores ?? [] },
      modelo: rotina.modelo ?? undefined,
      origem: "rotina",
      usuario_id: rotina.criado_por ?? null,
      timeout_ms: rotina.timeout_ms ?? undefined,
      retry_max: rotina.retry_max ?? undefined,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Motor de workflows: HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let executionId: string | null = null;
  let resposta = "";
  let erro: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const partes = buffer.split("\n\n");
    buffer = partes.pop() ?? "";
    for (const parte of partes) {
      const linha = parte.split("\n").find((l) => l.startsWith("data:"));
      if (!linha) continue;
      const payload = linha.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.execution_id) executionId = ev.execution_id;
        if (ev.evento === "fim") {
          resposta = String(ev.resposta ?? "");
          if (ev.status === "erro") erro = String(ev.erro ?? "Falha na execução");
        }
      } catch {
        /* chunk parcial */
      }
    }
  }
  if (erro) throw Object.assign(new Error(erro), { execution_id: executionId });
  return { execution_id: executionId, resposta };
}

/** Executa um prompt no runner do Claude Agent SDK (agente ou Claude Code). */
async function rodarClaude(
  db: any,
  rotina: any,
): Promise<{ execution_id: string | null; resposta: string }> {
  let prompt = String(rotina.prompt ?? "").trim();
  let sistema: string | null = null;
  let modelo = rotina.modelo ?? "claude-sonnet-4";

  if (rotina.agent_id) {
    const { data: agente } = await db.from("aip_agents").select("*").eq("id", rotina.agent_id).maybeSingle();
    if (agente) {
      sistema = agente.prompt_principal ?? null;
      modelo = rotina.modelo ?? agente.modelo_ia ?? modelo;
      if (!prompt) prompt = `Execute a rotina agendada "${rotina.nome}".`;
    }
  }
  if (!prompt) throw new Error("Rotina sem prompt configurado");

  const { data: exec } = await db
    .from("aip_executions")
    .insert({
      estabelecimento_id: rotina.estabelecimento_id,
      agent_id: rotina.agent_id ?? null,
      origem: "rotina",
      usuario_id: rotina.criado_por ?? null,
      status: "executando",
      modelo,
      prompt,
      input: { ...(rotina.input ?? {}), conectores: rotina.conectores ?? [] },
      iniciado_em: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  const t0 = Date.now();
  try {
    if (!RUNNER_URL) throw new Error("AIP_RUNNER_URL não configurada — conecte o runner do Claude Code");
    const res = await fetch(`${RUNNER_URL.replace(/\/$/, "")}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(RUNNER_KEY ? { Authorization: `Bearer ${RUNNER_KEY}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        system: sistema,
        model: modelo,
        input: rotina.input ?? {},
        connectors: rotina.conectores ?? [],
        rotina: { id: rotina.id, nome: rotina.nome },
      }),
    });
    const texto = await res.text();
    if (!res.ok) throw new Error(`Runner: HTTP ${res.status} — ${texto.slice(0, 500)}`);
    let resposta = texto;
    try {
      const j = JSON.parse(texto);
      resposta = String(j.output ?? j.result ?? j.text ?? texto);
    } catch {
      /* resposta em texto puro */
    }
    if (exec?.id) {
      await db
        .from("aip_executions")
        .update({
          status: "concluida",
          resposta,
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - t0,
        })
        .eq("id", exec.id);
    }
    return { execution_id: exec?.id ?? null, resposta };
  } catch (e) {
    if (exec?.id) {
      await db
        .from("aip_executions")
        .update({
          status: "erro",
          erro: (e as Error).message,
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - t0,
          motivo_interrupcao: "erro",
        })
        .eq("id", exec.id);
    }
    throw Object.assign(e as Error, { execution_id: exec?.id ?? null });
  }
}

const chaveMinuto = (d = new Date()) => d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Marca como erro runs travadas em "executando" além do timeout (evita bloquear a concorrência). */
async function liberarRunsTravadas(db: any, rotina: any) {
  const limite = new Date(Date.now() - Math.max(Number(rotina.timeout_ms ?? 0) || 600000, 60000) * 2).toISOString();
  await db
    .from("aip_rotina_runs")
    .update({
      status: "erro",
      erro: "Execução expirada (sem finalização dentro do tempo limite)",
      finalizado_em: new Date().toISOString(),
    })
    .eq("rotina_id", rotina.id)
    .eq("status", "executando")
    .lt("iniciado_em", limite);
}

/**
 * Políticas de execução:
 *  - proteção contra disparo duplicado no mesmo minuto (chave única por rotina+minuto);
 *  - limite de execuções simultâneas por rotina (max_concorrencia);
 *  - retries automáticos com backoff exponencial (retry_max, retry_backoff_ms, retry_fator).
 */
async function dispararRotina(db: any, rotina: any, origem: string) {
  const t0 = Date.now();
  const bloquearDuplicados = rotina.bloquear_duplicados !== false;
  const chave = bloquearDuplicados ? chaveMinuto() : null;

  await liberarRunsTravadas(db, rotina);

  // 1) Limite de concorrência
  const maxConc = Math.max(1, Number(rotina.max_concorrencia ?? 1) || 1);
  const { count: emAndamento } = await db
    .from("aip_rotina_runs")
    .select("id", { count: "exact", head: true })
    .eq("rotina_id", rotina.id)
    .eq("status", "executando");
  if ((emAndamento ?? 0) >= maxConc) {
    await db.from("aip_rotina_runs").insert({
      estabelecimento_id: rotina.estabelecimento_id,
      rotina_id: rotina.id,
      origem,
      status: "ignorada",
      motivo_bloqueio: "concorrencia",
      erro: `Limite de ${maxConc} execução(ões) simultânea(s) atingido`,
      finalizado_em: new Date().toISOString(),
      duracao_ms: 0,
    });
    return { rotina_id: rotina.id, status: "ignorada", motivo: "concorrencia" };
  }

  // 2) Proteção contra disparo duplicado no mesmo minuto (índice único rotina+minuto)
  const { data: run, error: runErro } = await db
    .from("aip_rotina_runs")
    .insert({
      estabelecimento_id: rotina.estabelecimento_id,
      rotina_id: rotina.id,
      origem,
      status: "executando",
      tentativa: 1,
      chave_minuto: chave,
      iniciado_em: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (runErro) {
    if ((runErro as any).code === "23505") {
      return { rotina_id: rotina.id, status: "ignorada", motivo: "duplicada_no_minuto" };
    }
    throw new Error(runErro.message);
  }

  const finalizar = async (patch: Record<string, unknown>) => {
    if (run?.id) {
      await db
        .from("aip_rotina_runs")
        .update({ ...patch, finalizado_em: new Date().toISOString(), duracao_ms: Date.now() - t0 })
        .eq("id", run.id);
    }
  };

  let proxima: string | null = null;
  try {
    proxima = proximaExecucao(rotina.cron_expressao, rotina.fuso ?? "UTC")?.toISOString() ?? null;
  } catch {
    proxima = null;
  }

  // 3) Retries automáticos com backoff exponencial
  const maxTentativas = Math.max(1, Number(rotina.retry_max ?? 0) + 1);
  const backoffBase = Math.max(0, Number(rotina.retry_backoff_ms ?? 30000) || 0);
  const fator = Math.max(1, Number(rotina.retry_fator ?? 2) || 2);

  let ultimoErro = "";
  let ultimoExecId: string | null = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    if (tentativa > 1) {
      const espera = Math.min(backoffBase * Math.pow(fator, tentativa - 2), 120000);
      if (espera > 0) await dormir(espera);
      if (run?.id) await db.from("aip_rotina_runs").update({ tentativa }).eq("id", run.id);
    }
    try {
      const resultado =
        rotina.tipo_alvo === "workflow" ? await rodarWorkflow(rotina) : await rodarClaude(db, rotina);

      await finalizar({
        status: "concluida",
        tentativa,
        execution_id: resultado.execution_id,
        detalhes: { resposta: resultado.resposta?.slice(0, 4000) ?? "", tentativas: tentativa },
      });
      await db
        .from("aip_rotinas")
        .update({
          ultima_execucao: new Date().toISOString(),
          ultimo_status: "concluida",
          ultimo_erro: null,
          ultima_execution_id: resultado.execution_id,
          proxima_execucao: proxima,
        })
        .eq("id", rotina.id);
      return { rotina_id: rotina.id, status: "concluida", execution_id: resultado.execution_id, tentativas: tentativa };
    } catch (e) {
      ultimoErro = (e as Error).message;
      ultimoExecId = (e as any).execution_id ?? ultimoExecId;
      console.warn(`Rotina ${rotina.id} tentativa ${tentativa}/${maxTentativas} falhou: ${ultimoErro}`);
    }
  }

  await finalizar({
    status: "erro",
    erro: ultimoErro,
    tentativa: maxTentativas,
    execution_id: ultimoExecId,
    detalhes: { tentativas: maxTentativas },
  });
  await db
    .from("aip_rotinas")
    .update({
      ultima_execucao: new Date().toISOString(),
      ultimo_status: "erro",
      ultimo_erro: ultimoErro,
      ultima_execution_id: ultimoExecId,
      proxima_execucao: proxima,
    })
    .eq("id", rotina.id);
  return { rotina_id: rotina.id, status: "erro", erro: ultimoErro, tentativas: maxTentativas };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const db = admin();

    // Execução manual de uma rotina: exige usuário autenticado do app.
    if (body?.rotina_id) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return json({ error: "Não autenticado" }, 401);

      // A leitura passa pelo client do usuário → RLS garante o isolamento por estabelecimento.
      const { data: rotina } = await userClient
        .from("aip_rotinas")
        .select("*")
        .eq("id", body.rotina_id)
        .maybeSingle();
      if (!rotina) return json({ error: "Rotina não encontrada" }, 404);

      const r = await dispararRotina(db, { ...rotina, criado_por: rotina.criado_por ?? userData.user.id }, "manual");
      return json(r, r.status === "erro" ? 200 : 200);
    }

    // Disparo automático (pg_cron): todas as rotinas vencidas.
    const agora = new Date().toISOString();
    const { data: rotinas, error } = await db
      .from("aip_rotinas")
      .select("*")
      .eq("ativo", true)
      .not("proxima_execucao", "is", null)
      .lte("proxima_execucao", agora)
      .limit(25);
    if (error) return json({ error: error.message }, 500);

    const resultados = [];
    for (const rotina of rotinas ?? []) {
      // Marca a próxima execução antes de rodar para evitar disparo duplicado.
      let proxima: string | null = null;
      try {
        proxima = proximaExecucao(rotina.cron_expressao, rotina.fuso ?? "UTC")?.toISOString() ?? null;
      } catch {
        proxima = null;
      }
      await db.from("aip_rotinas").update({ proxima_execucao: proxima }).eq("id", rotina.id);
      resultados.push(await dispararRotina(db, rotina, "agendada"));
    }

    return json({ processadas: resultados.length, resultados });
  } catch (e) {
    console.error("aip-rotinas-scheduler", e);
    return json({ error: (e as Error).message }, 500);
  }
});
