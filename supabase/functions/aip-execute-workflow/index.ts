import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Motor de execução dos workflows da Plataforma de Agentes IA.
 *
 * - Percorre os blocos do Workflow Builder em ordem topológica
 * - Persiste `aip_executions` (execução) e `aip_execution_steps` (histórico por etapa)
 * - Faz streaming SSE dos eventos para a UI (status, logs, texto do modelo)
 * - Pausa em blocos de aprovação humana (cria `aip_approvals`) e permite retomar
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODELO_PADRAO = "google/gemini-3.6-flash";

type Json = Record<string, any>;

const enc = new TextEncoder();

function sse(controller: ReadableStreamDefaultController, evento: string, dados: Json) {
  controller.enqueue(enc.encode(`data: ${JSON.stringify({ evento, ...dados })}\n\n`));
}

/** Interpola {{input.x}}, {{steps.<id>}}, {{last}} no texto. */
function interpolar(texto: string, ctx: Json): string {
  if (!texto) return "";
  return texto.replace(/\{\{\s*([\w.\-]+)\s*\}\}/g, (_m, caminho: string) => {
    const partes = caminho.split(".");
    let atual: any = ctx;
    for (const p of partes) {
      if (atual == null) return "";
      atual = atual[p];
    }
    if (atual == null) return "";
    return typeof atual === "string" ? atual : JSON.stringify(atual);
  });
}

/** Ordena os nós seguindo as conexões a partir dos blocos sem entrada. */
function ordenarNos(nodes: any[], edges: any[]): any[] {
  if (nodes.length === 0) return [];
  const porId = new Map(nodes.map((n) => [n.id, n]));
  const temEntrada = new Set(edges.map((e) => e.target));
  const raizes = nodes.filter((n) => !temEntrada.has(n.id));
  const inicio = raizes.length > 0 ? raizes : [nodes[0]];
  const visitados = new Set<string>();
  const ordem: any[] = [];
  const fila = [...inicio];
  while (fila.length) {
    const atual = fila.shift()!;
    if (!atual || visitados.has(atual.id)) continue;
    visitados.add(atual.id);
    ordem.push(atual);
    edges
      .filter((e) => e.source === atual.id)
      .forEach((e) => {
        const alvo = porId.get(e.target);
        if (alvo && !visitados.has(alvo.id)) fila.push(alvo);
      });
  }
  // blocos soltos entram no fim, preservando a ordem do canvas
  nodes.forEach((n) => {
    if (!visitados.has(n.id)) ordem.push(n);
  });
  return ordem;
}

async function chamarModelo(modelo: string, prompt: string, sistema?: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
  const mensagens: Json[] = [];
  if (sistema) mensagens.push({ role: "system", content: sistema });
  mensagens.push({ role: "user", content: prompt });

  const body: Json = { model: modelo, messages: mensagens };
  if (modelo.startsWith("openai/gpt-5.6")) body.reasoning_effort = "none";

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!res.ok) throw new Error(`Falha na IA (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return {
    texto: String(data?.choices?.[0]?.message?.content ?? ""),
    tokens_input: Number(data?.usage?.prompt_tokens ?? 0),
    tokens_output: Number(data?.usage?.completion_tokens ?? 0),
  };
}

/** Erros de interrupção (distinguem timeout/cancelamento de erro comum). */
class InterrupcaoErro extends Error {
  motivo: "timeout" | "cancelada";
  constructor(motivo: "timeout" | "cancelada", mensagem: string) {
    super(mensagem);
    this.motivo = motivo;
  }
}

const TIMEOUT_PADRAO_MS = 120000;
const TIMEOUT_MAX_MS = 600000;

/** Resolve o tempo limite da etapa (0 = sem limite). */
function resolverTimeout(cfgNo: Json, paramsNo: Json, body: Json): number {
  const bruto = Number(
    cfgNo.timeout_ms ?? paramsNo.timeout_ms ?? body.timeout_ms ?? TIMEOUT_PADRAO_MS,
  );
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  return Math.min(TIMEOUT_MAX_MS, Math.max(1000, bruto));
}

interface ResultadoNo {
  output: Json;
  texto?: string;
  tokens_input?: number;
  tokens_output?: number;
  logs?: string;
  aprovacao?: { titulo: string; instrucoes?: string; tipo: string; payload: Json };
}


async function executarNo(node: any, ctx: Json, modeloExec: string): Promise<ResultadoNo> {
  const data = node.data ?? {};
  const config = data.config ?? {};
  const params: Json = config.params ?? {};
  const categoria = String(data.categoria ?? "");
  const slug = String(data.slug ?? "");
  const prompt = interpolar(String(config.prompt ?? ""), ctx);

  // --- Helpers ---------------------------------------------------------
  if (categoria === "helpers") {
    switch (slug) {
      case "delay": {
        const ms = Math.min(Number(params.ms ?? params.segundos ? Number(params.segundos) * 1000 : 1000), 15000);
        await new Promise((r) => setTimeout(r, ms));
        return { output: { aguardou_ms: ms }, logs: `Aguardou ${ms}ms` };
      }
      case "template-prompt":
        return { output: { texto: prompt }, texto: prompt };
      case "regex": {
        const alvo = interpolar(String(params.texto ?? "{{last}}"), ctx);
        const re = new RegExp(String(params.padrao ?? ".*"), String(params.flags ?? "g"));
        const achados = alvo.match(re) ?? [];
        return { output: { achados }, logs: `${achados.length} ocorrência(s)` };
      }
      case "json-parser": {
        const bruto = interpolar(String(params.texto ?? "{{last}}"), ctx);
        try {
          return { output: { json: JSON.parse(bruto) } };
        } catch (e) {
          throw new Error(`JSON inválido: ${(e as Error).message}`);
        }
      }
      case "if":
      case "else": {
        const esq = interpolar(String(params.valor ?? "{{last}}"), ctx);
        const dir = interpolar(String(params.comparar ?? ""), ctx);
        const op = String(params.operador ?? "contem");
        const ok =
          op === "igual" ? esq === dir : op === "diferente" ? esq !== dir : esq.includes(dir);
        return { output: { condicao: ok }, logs: `Condição ${op}: ${ok}` };
      }
      case "merge":
        return { output: { merge: ctx.steps } };
      case "split": {
        const alvo = interpolar(String(params.texto ?? "{{last}}"), ctx);
        return { output: { partes: alvo.split(String(params.separador ?? "\n")) } };
      }
      case "human-approval":
        return {
          output: {},
          aprovacao: {
            titulo: String(config.titulo ?? data.label ?? "Aprovação necessária"),
            instrucoes: prompt || String(config.instrucoes ?? ""),
            tipo: String(params.tipo ?? "texto"),
            payload: { contexto: ctx.last ?? null, node_id: node.id },
          },
        };
      default:
        return { output: { ok: true }, logs: `Bloco ${slug} sem efeito colateral` };
    }
  }

  // --- Webhook / integrações HTTP --------------------------------------
  if (slug === "webhook" || params.url) {
    const url = interpolar(String(params.url ?? ""), ctx);
    if (!url) throw new Error("Informe params.url para este bloco");
    const metodo = String(params.metodo ?? "POST").toUpperCase();
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(params.headers ?? {}) },
      body: metodo === "GET" ? undefined : JSON.stringify(params.body ?? { prompt, contexto: ctx.last ?? null }),
    });
    const texto = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${texto.slice(0, 300)}`);
    let corpo: any = texto;
    try {
      corpo = JSON.parse(texto);
    } catch { /* texto puro */ }
    return { output: { status: res.status, corpo }, logs: `${metodo} ${url} → ${res.status}` };
  }

  // --- Qualquer bloco com prompt vira chamada de IA ---------------------
  if (prompt) {
    const modelo = String(config.modelo ?? params.modelo ?? modeloExec);
    const r = await chamarModelo(modelo, prompt, config.sistema ? String(config.sistema) : undefined);
    return {
      output: { texto: r.texto, modelo },
      texto: r.texto,
      tokens_input: r.tokens_input,
      tokens_output: r.tokens_output,
      logs: `Modelo ${modelo}`,
    };
  }

  return {
    output: { ignorado: true },
    logs: `Bloco "${categoria}/${slug}" sem prompt nem URL configurados — nada a executar.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const body = await req.json().catch(() => ({}));

  // Chamada interna (agendador de rotinas): usa a service role e o usuário informado.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const interno =
    req.headers.get("x-aip-internal") === "1" &&
    serviceKey.length > 0 &&
    authHeader === `Bearer ${serviceKey}`;

  const supabase = interno
    ? createClient(Deno.env.get("SUPABASE_URL")!, serviceKey)
    : createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

  let usuarioId: string | null = body.usuario_id ?? null;
  if (!interno) {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    usuarioId = userData.user.id;
  }

  const workflowId: string | undefined = body.workflow_id;
  const retomar: string | undefined = body.execution_id;
  const entrada: Json = body.input ?? {};


  const stream = new ReadableStream({
    async start(controller) {
      const t0 = Date.now();
      let executionId = retomar ?? null;
      let estabelecimentoId: string | null = null;

      const finalizar = () => {
        try {
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        } catch { /* já fechado */ }
      };

      try {
        // 1. Workflow + execução -----------------------------------------
        let execAtual: any = null;
        if (retomar) {
          const { data } = await supabase.from("aip_executions").select("*").eq("id", retomar).maybeSingle();
          if (!data) throw new Error("Execução não encontrada");
          execAtual = data;
          estabelecimentoId = data.estabelecimento_id;
        }

        const wfId = workflowId ?? execAtual?.workflow_id;
        if (!wfId) throw new Error("Workflow não informado");

        const { data: wf, error: wfErr } = await supabase
          .from("aip_workflows")
          .select("*")
          .eq("id", wfId)
          .maybeSingle();
        if (wfErr || !wf) throw new Error("Workflow não encontrado ou sem permissão");
        estabelecimentoId = wf.estabelecimento_id;

        // Snapshot imutável: retomadas usam SEMPRE o snapshot gravado na execução.
        const versaoAtual = Number(wf.versao ?? 1);
        let snapshot: any = execAtual?.workflow_snapshot ?? null;
        let versaoSnapshot: number = Number(execAtual?.workflow_versao ?? versaoAtual);
        let versionId: string | null = execAtual?.workflow_version_id ?? null;

        if (!snapshot) {
          const { data: ver } = await supabase
            .from("aip_workflow_versions")
            .select("id, versao, flow_data")
            .eq("workflow_id", wfId)
            .eq("versao", versaoAtual)
            .maybeSingle();
          versionId = ver?.id ?? null;
          versaoSnapshot = Number(ver?.versao ?? versaoAtual);
          snapshot = {
            workflow_id: wfId,
            nome: wf.nome,
            descricao: wf.descricao ?? null,
            versao: versaoSnapshot,
            version_id: versionId,
            flow_data: ver?.flow_data ?? wf.flow_data ?? { nodes: [], edges: [] },
            capturado_em: new Date().toISOString(),
          };
        }

        const nodes: any[] = snapshot.flow_data?.nodes ?? [];
        const edges: any[] = snapshot.flow_data?.edges ?? [];
        if (nodes.length === 0) throw new Error("Workflow sem blocos para executar");
        const ordem = ordenarNos(nodes, edges);

        const modeloExec = String(body.modelo ?? MODELO_PADRAO);

        if (!execAtual) {
          const { data, error } = await supabase
            .from("aip_executions")
            .insert({
              estabelecimento_id: estabelecimentoId,
              workflow_id: wfId,
              workflow_versao: versaoSnapshot,
              workflow_version_id: versionId,
              workflow_snapshot: snapshot,
              origem: String(body.origem ?? "workflow"),
              usuario_id: usuarioId,
              status: "executando",
              modelo: modeloExec,
              input: entrada,
              contexto: {},
              cancelamento_solicitado: false,
              motivo_interrupcao: null,
              iniciado_em: new Date().toISOString(),
            })
            .select()
            .single();
          if (error) throw new Error(`Não foi possível criar a execução: ${error.message}`);
          execAtual = data;
        } else {
          const patch: Record<string, unknown> = {
            status: "executando",
            erro: null,
            finalizado_em: null,
            cancelamento_solicitado: false,
            motivo_interrupcao: null,
            cancelado_em: null,
            retomado_em: new Date().toISOString(),
            retomado_por: usuarioId,
            retentativas: Number(execAtual.retentativas ?? 0) + 1,
          };
          // grava o snapshot apenas se a execução ainda não tiver um (execuções antigas)
          if (!execAtual.workflow_snapshot) {
            patch.workflow_snapshot = snapshot;
            patch.workflow_versao = versaoSnapshot;
            patch.workflow_version_id = versionId;
          }
          await supabase.from("aip_executions").update(patch).eq("id", execAtual.id);
        }

        executionId = execAtual.id;

        sse(controller, "execucao", {
          execution_id: executionId,
          status: "executando",
          total_etapas: ordem.length,
          workflow: snapshot.nome ?? wf.nome,
          workflow_versao: versaoSnapshot,
        });


        // 2. Contexto (retomada preserva os passos já concluídos) ---------
        const ctxSalvo: Json = execAtual.contexto ?? {};
        const ctx: Json = {
          input: { ...(execAtual.input ?? {}), ...entrada },
          steps: ctxSalvo.steps ?? {},
          last: ctxSalvo.last ?? null,
        };
        let indice = Number(ctxSalvo.indice ?? 0);

        // Retry manual a partir de um bloco específico (ponto do erro)
        const retryNodeId: string | undefined = body.retry_node_id ?? execAtual?.retomado_de_node_id ?? undefined;
        if (retomar && retryNodeId) {
          const pos = ordem.findIndex((n: any) => n.id === retryNodeId);
          if (pos >= 0) indice = pos;
        }
        if (indice >= ordem.length) indice = Math.max(0, ordem.length - 1);

        let tokensIn = Number(execAtual.tokens_input ?? 0);
        let tokensOut = Number(execAtual.tokens_output ?? 0);
        let ultimoTexto: string = execAtual.resposta ?? "";

        // 3. Cancelamento e limites por etapa -----------------------------
        let cancelado = false;
        async function checarCancelamento(): Promise<boolean> {
          if (cancelado) return true;
          const { data } = await supabase
            .from("aip_executions")
            .select("cancelamento_solicitado, status")
            .eq("id", executionId)
            .maybeSingle();
          if (data?.cancelamento_solicitado || data?.status === "cancelada") {
            cancelado = true;
          }
          return cancelado;
        }

        /** Executa a etapa com tempo limite e vigilância de cancelamento. */
        function comLimites<T>(fn: () => Promise<T>, timeoutMs: number, tituloEtapa: string): Promise<T> {
          return new Promise<T>((resolve, reject) => {
            let terminou = false;
            const encerrar = () => {
              terminou = true;
              if (timer) clearTimeout(timer);
              clearInterval(vigia);
            };
            const timer = timeoutMs
              ? setTimeout(() => {
                  if (terminou) return;
                  encerrar();
                  reject(
                    new InterrupcaoErro(
                      "timeout",
                      `Tempo limite de ${Math.round(timeoutMs / 1000)}s excedido na etapa "${tituloEtapa}"`,
                    ),
                  );
                }, timeoutMs)
              : null;
            const vigia = setInterval(async () => {
              if (terminou) return;
              if (await checarCancelamento()) {
                if (terminou) return;
                encerrar();
                reject(new InterrupcaoErro("cancelada", "Execução cancelada pelo usuário"));
              }
            }, 2000);
            fn().then(
              (v) => {
                if (terminou) return;
                encerrar();
                resolve(v);
              },
              (e) => {
                if (terminou) return;
                encerrar();
                reject(e);
              },
            );
          });
        }

        async function registrarCancelamento(node: any, tituloEtapa: string, indiceAtual: number) {
          await supabase
            .from("aip_executions")
            .update({
              status: "cancelada",
              etapa_atual: tituloEtapa,
              erro: "Execução cancelada pelo usuário",
              motivo_interrupcao: "cancelada",
              cancelado_em: new Date().toISOString(),
              contexto: { ...ctx, indice: indiceAtual },
              retomado_de_node_id: node?.id ?? null,
              tokens_input: tokensIn,
              tokens_output: tokensOut,
              duracao_ms: Date.now() - t0,
              finalizado_em: new Date().toISOString(),
            })
            .eq("id", executionId);
          sse(controller, "fim", {
            status: "cancelada",
            motivo_interrupcao: "cancelada",
            erro: "Execução cancelada pelo usuário",
            execution_id: executionId,
            node_id: node?.id ?? null,
            ordem: indiceAtual + 1,
          });
        }

        // 4. Loop de execução --------------------------------------------
        for (; indice < ordem.length; indice++) {
          const node = ordem[indice];
          const titulo = String(node.data?.label ?? node.data?.nome ?? node.id);
          const tipo = `${node.data?.categoria ?? "bloco"}/${node.data?.slug ?? "custom"}`;

          if (await checarCancelamento()) {
            await registrarCancelamento(node, titulo, indice);
            return finalizar();
          }




          // 3a. Retomada automática: consome a decisão já registrada -------
          if (String(node.data?.slug ?? "") === "human-approval") {
            const { data: aprov } = await supabase
              .from("aip_approvals")
              .select("*")
              .eq("execution_id", executionId)
              .eq("node_id", node.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (aprov && aprov.status === "rejeitado") {
              await supabase
                .from("aip_executions")
                .update({
                  status: "cancelada",
                  etapa_atual: null,
                  erro: `Aprovação rejeitada por ${aprov.decidido_por_nome ?? "usuário"}`,
                  contexto: { ...ctx, indice },
                  duracao_ms: Date.now() - t0,
                  finalizado_em: new Date().toISOString(),
                })
                .eq("id", executionId);
              sse(controller, "fim", { status: "cancelada", execution_id: executionId, erro: "Aprovação rejeitada" });
              return finalizar();
            }

            if (aprov && aprov.status === "aprovado") {
              const decisao = {
                aprovado: true,
                comentario: aprov.comentario ?? "",
                selecionados: aprov.selecionados ?? [],
                aprovado_por: aprov.decidido_por_nome ?? null,
                aprovado_por_id: aprov.decidido_por ?? null,
                aprovado_em: aprov.decidido_em ?? null,
              };
              ctx.steps[node.id] = decisao;
              const logAprov = `Aprovado por ${decisao.aprovado_por ?? "usuário"}${
                decisao.aprovado_em ? ` em ${new Date(decisao.aprovado_em).toLocaleString("pt-BR")}` : ""
              }`;
              await supabase
                .from("aip_execution_steps")
                .update({ status: "concluida", output: decisao, logs: logAprov })
                .eq("execution_id", executionId)
                .eq("node_id", node.id)
                .eq("status", "aguardando_aprovacao");
              sse(controller, "etapa_fim", {
                node_id: node.id,
                ordem: indice + 1,
                status: "concluida",
                logs: logAprov,
                output: decisao,
              });
              continue;
            }
          }
          // 3b. Tentativas (retry automático configurável por bloco) -------
          const cfgNo: Json = node.data?.config ?? {};
          const paramsNo: Json = cfgNo.params ?? {};
          const retryCfg: Json = cfgNo.retry ?? {};
          const tentativasMax = Math.max(
            1,
            Math.min(
              5,
              Number(
                retryCfg.tentativas ??
                  cfgNo.retry_max ??
                  paramsNo.retry_max ??
                  body.retry_max ??
                  1,
              ) || 1,
            ),
          );
          const retryDelay = Math.max(
            0,
            Math.min(
              20000,
              Number(retryCfg.delay_ms ?? paramsNo.retry_delay_ms ?? body.retry_delay_ms ?? 1500) || 0,
            ),
          );

          const timeoutMs = resolverTimeout(cfgNo, paramsNo, body);

          let tentativa = 0;
          let concluiuEtapa = false;


          while (tentativa < tentativasMax && !concluiuEtapa) {
            tentativa++;
            const inicioTentativa = Date.now();

            const { data: step } = await supabase
              .from("aip_execution_steps")
              .insert({
                estabelecimento_id: estabelecimentoId,
                execution_id: executionId,
                node_id: node.id,
                tipo,
                titulo,
                status: "executando",
                input: { config: node.data?.config ?? {} },
                ordem: indice + 1,
                tentativa,
                tentativas_max: tentativasMax,
                timeout_ms: timeoutMs || null,
              })

              .select()
              .single();

            await supabase
              .from("aip_executions")
              .update({ etapa_atual: tentativa > 1 ? `${titulo} (tentativa ${tentativa}/${tentativasMax})` : titulo })
              .eq("id", executionId);

            sse(controller, "etapa_inicio", {
              step_id: step?.id ?? null,
              node_id: node.id,
              ordem: indice + 1,
              titulo,
              tipo,
              tentativa,
              tentativas_max: tentativasMax,
            });

            try {
              const r = await comLimites(() => executarNo(node, ctx, modeloExec), timeoutMs, titulo);


              // Aprovação humana: pausa a execução e salva o ponto de retomada
              if (r.aprovacao) {
                const { data: pendente } = await supabase
                  .from("aip_approvals")
                  .select("id")
                  .eq("execution_id", executionId)
                  .eq("node_id", node.id)
                  .eq("status", "pendente")
                  .maybeSingle();
                if (!pendente) {
                  await supabase
                    .from("aip_approvals")
                    .insert({
                      estabelecimento_id: estabelecimentoId,
                      execution_id: executionId,
                      node_id: node.id,
                      titulo: r.aprovacao.titulo,
                      instrucoes: r.aprovacao.instrucoes ?? null,
                      tipo: r.aprovacao.tipo,
                      payload: r.aprovacao.payload,
                    });
                }
                if (step)
                  await supabase
                    .from("aip_execution_steps")
                    .update({
                      status: "aguardando_aprovacao",
                      logs: "Aguardando decisão humana",
                      duracao_ms: Date.now() - inicioTentativa,
                    })
                    .eq("id", step.id);
                await supabase
                  .from("aip_executions")
                  .update({
                    status: "aguardando_aprovacao",
                    pausado_em: new Date().toISOString(),
                    contexto: { ...ctx, indice },
                    tokens_input: tokensIn,
                    tokens_output: tokensOut,
                    resposta: ultimoTexto || null,
                  })
                  .eq("id", executionId);
                sse(controller, "aprovacao", { node_id: node.id, titulo: r.aprovacao.titulo });
                sse(controller, "fim", { status: "aguardando_aprovacao", execution_id: executionId });
                return finalizar();
              }

              tokensIn += r.tokens_input ?? 0;
              tokensOut += r.tokens_output ?? 0;
              ctx.steps[node.id] = r.output;
              ctx.last = r.texto ?? r.output;
              if (r.texto) ultimoTexto = r.texto;

              const logConcluida =
                tentativa > 1 ? `${r.logs ? `${r.logs} — ` : ""}Sucesso na tentativa ${tentativa}` : r.logs ?? null;

              if (step)
                await supabase
                  .from("aip_execution_steps")
                  .update({
                    status: "concluida",
                    output: r.output,
                    logs: logConcluida,
                    tokens_input: r.tokens_input ?? 0,
                    tokens_output: r.tokens_output ?? 0,
                    duracao_ms: Date.now() - inicioTentativa,
                  })
                  .eq("id", step.id);

              if (r.texto) sse(controller, "texto", { node_id: node.id, texto: r.texto });
              sse(controller, "etapa_fim", {
                step_id: step?.id ?? null,
                node_id: node.id,
                ordem: indice + 1,
                status: "concluida",
                duracao_ms: Date.now() - inicioTentativa,
                logs: logConcluida,
                output: r.output,
                tentativa,
              });
              concluiuEtapa = true;
            } catch (erroEtapa) {
              const msg = (erroEtapa as Error).message;
              const interrupcao = erroEtapa instanceof InterrupcaoErro ? erroEtapa.motivo : null;
              // Timeout pode ser retentado; cancelamento nunca.
              const podeRetentar = interrupcao !== "cancelada" && tentativa < tentativasMax;

              if (step)
                await supabase
                  .from("aip_execution_steps")
                  .update({
                    status: interrupcao === "cancelada" ? "cancelada" : "erro",
                    motivo_interrupcao: interrupcao ?? "erro",
                    timeout_ms: timeoutMs || null,
                    logs: podeRetentar ? `${msg} — nova tentativa automática (${tentativa}/${tentativasMax})` : msg,
                    duracao_ms: Date.now() - inicioTentativa,
                  })
                  .eq("id", step.id);

              sse(controller, "etapa_fim", {
                node_id: node.id,
                ordem: indice + 1,
                status: interrupcao === "cancelada" ? "cancelada" : "erro",
                motivo_interrupcao: interrupcao ?? "erro",
                erro: msg,
                tentativa,
                tentativas_max: tentativasMax,
              });

              if (interrupcao === "cancelada") {
                await supabase
                  .from("aip_executions")
                  .update({
                    status: "cancelada",
                    etapa_atual: titulo,
                    erro: msg,
                    motivo_interrupcao: "cancelada",
                    cancelado_em: new Date().toISOString(),
                    contexto: { ...ctx, indice },
                    retomado_de_node_id: node.id,
                    tokens_input: tokensIn,
                    tokens_output: tokensOut,
                    duracao_ms: Date.now() - t0,
                    finalizado_em: new Date().toISOString(),
                  })
                  .eq("id", executionId);
                sse(controller, "fim", {
                  status: "cancelada",
                  motivo_interrupcao: "cancelada",
                  erro: msg,
                  execution_id: executionId,
                  node_id: node.id,
                  ordem: indice + 1,
                });
                return finalizar();
              }


              if (podeRetentar) {
                const espera = retryDelay * Math.pow(2, tentativa - 1);
                sse(controller, "retry", {
                  node_id: node.id,
                  ordem: indice + 1,
                  titulo,
                  tentativa: tentativa + 1,
                  tentativas_max: tentativasMax,
                  aguardando_ms: espera,
                  erro: msg,
                });
                if (espera > 0) await new Promise((r) => setTimeout(r, Math.min(espera, 20000)));
                continue;
              }

              // Esgotou as tentativas: para no ponto do erro (permite retry manual)
              await supabase
                .from("aip_executions")
                .update({
                  status: "erro",
                  erro: `${titulo}: ${msg}`,
                  motivo_interrupcao: interrupcao ?? "erro",
                  etapa_atual: titulo,
                  contexto: { ...ctx, indice },

                  retomado_de_node_id: node.id,
                  tokens_input: tokensIn,
                  tokens_output: tokensOut,
                  duracao_ms: Date.now() - t0,
                  finalizado_em: new Date().toISOString(),
                })
                .eq("id", executionId);
              sse(controller, "fim", {
                status: "erro",
                erro: msg,
                execution_id: executionId,
                node_id: node.id,
                ordem: indice + 1,
                tentativas: tentativa,
              });
              return finalizar();
            }
          }
        }


        // 4. Conclusão ----------------------------------------------------
        await supabase
          .from("aip_executions")
          .update({
            status: "concluida",
            etapa_atual: null,
            retomado_de_node_id: null,

            resposta: ultimoTexto || null,
            contexto: { ...ctx, indice },
            tokens_input: tokensIn,
            tokens_output: tokensOut,
            duracao_ms: Date.now() - t0,
            finalizado_em: new Date().toISOString(),
          })
          .eq("id", executionId);

        sse(controller, "fim", {
          status: "concluida",
          execution_id: executionId,
          duracao_ms: Date.now() - t0,
          tokens: tokensIn + tokensOut,
          resposta: ultimoTexto,
        });
        finalizar();
      } catch (e) {
        const msg = (e as Error).message;
        const motivo = e instanceof InterrupcaoErro ? e.motivo : "erro";
        if (executionId) {
          await supabase
            .from("aip_executions")
            .update({
              status: motivo === "cancelada" ? "cancelada" : "erro",
              erro: msg,
              motivo_interrupcao: motivo,
              duracao_ms: Date.now() - t0,
              finalizado_em: new Date().toISOString(),
            })
            .eq("id", executionId);
        }
        sse(controller, "fim", {
          status: motivo === "cancelada" ? "cancelada" : "erro",
          motivo_interrupcao: motivo,
          erro: msg,
          execution_id: executionId,
        });
        finalizar();
      }

    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
