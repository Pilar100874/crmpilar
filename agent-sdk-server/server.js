import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

/**
 * Servidor de execução (Claude Agent SDK) da Plataforma de Agentes IA.
 *
 * Recebe do Lovable (via Edge Function `aip-run-proxy`) TODOS os parâmetros da
 * execução — agente, prompt, modelo, skills, tools, MCPs e input — roda o
 * Claude Agent SDK aqui e devolve o resultado em streaming (SSE), gravando
 * resposta, tokens, custo e assets de volta no Supabase.
 *
 * Rotas (todas POST, protegidas por X-Runner-Key):
 *   /health   → { ok, versao, modelos }
 *   /start    → inicia a execução (não bloqueia)
 *   /stream   → SSE com o texto gerado
 *   /resume   → retoma após aprovação humana
 *   /cancel   → cancela
 *   /status   → estado atual
 */

const app = express();
app.use(cors({ origin: "*", exposedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "25mb" }));

const RUNNER_KEY = process.env.RUNNER_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

/** Execuções em memória: id → { status, texto, listeners, abort, ... } */
const runs = new Map();

const now = () => new Date().toISOString();

function autenticar(req, res) {
  if (!RUNNER_KEY) return true; // sem chave configurada = ambiente de teste
  if (req.get("X-Runner-Key") === RUNNER_KEY) return true;
  res.status(401).json({ error: "Chave do runner inválida" });
  return false;
}

function obter(id) {
  if (!runs.has(id)) {
    runs.set(id, {
      id,
      status: "pendente",
      texto: "",
      listeners: new Set(),
      criado_em: now(),
      tokens_input: 0,
      tokens_output: 0,
      custo: 0,
      cancelado: false,
      aguardando: null,
    });
  }
  return runs.get(id);
}

function emitir(run, payload) {
  for (const enviar of run.listeners) enviar(payload);
}

function escrever(run, texto) {
  run.texto += texto;
  emitir(run, { text: texto });
}

/** Monta o system prompt a partir das skills recebidas do Lovable. */
function montarSystemPrompt({ agent, skills = [], tools = [], mcps = [] }) {
  const partes = [];
  if (agent?.prompt_principal) partes.push(agent.prompt_principal);
  if (skills.length) {
    partes.push(
      "# Skills disponíveis\n" +
        skills
          .map((s) => `## ${s.nome}\n${s.descricao ?? ""}\n\n${s.conteudo_md ?? ""}`)
          .join("\n\n---\n\n"),
    );
  }
  if (tools.length) {
    partes.push(
      "# Tools liberadas\n" +
        tools.map((t) => `- ${t.nome} (${t.tipo}): ${t.descricao ?? ""}`).join("\n"),
    );
  }
  if (mcps.length) {
    partes.push("# Servidores MCP conectados\n" + mcps.map((m) => `- ${m.nome}: ${m.endpoint}`).join("\n"));
  }
  return partes.join("\n\n");
}

/** Converte as tools do Lovable em MCP servers do Claude Agent SDK. */
function montarMcpServers(mcps = []) {
  const servers = {};
  for (const m of mcps) {
    if (!m?.endpoint) continue;
    const chave = (m.nome || m.id || "mcp").toString().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    servers[chave] = {
      type: m.tipo === "sse" ? "sse" : "http",
      url: m.endpoint,
      ...(m.token ? { headers: { Authorization: `Bearer ${m.token}` } } : {}),
    };
  }
  return servers;
}

/** Executa de fato o Claude Agent SDK e alimenta o stream. */
async function executar(run, payload) {
  run.status = "executando";
  const systemPrompt = montarSystemPrompt(payload);
  const modelo = payload.modelo || payload.agent?.modelo_ia || "claude-sonnet-4-5";
  const prompt =
    payload.prompt ||
    (payload.input ? `Entrada:\n${JSON.stringify(payload.input, null, 2)}` : "Execute a tarefa.");

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");

    const { query } = await import("@anthropic-ai/claude-agent-sdk");

    const iterador = query({
      prompt,
      options: {
        model: modelo,
        systemPrompt: systemPrompt || undefined,
        mcpServers: montarMcpServers(payload.mcps),
        permissionMode: "bypassPermissions",
        maxTurns: payload.max_turns ?? 30,
        cwd: process.env.WORKSPACE_DIR || "/tmp",
      },
    });

    for await (const msg of iterador) {
      if (run.cancelado) break;

      if (msg.type === "assistant") {
        for (const bloco of msg.message?.content ?? []) {
          if (bloco.type === "text") escrever(run, bloco.text);
          if (bloco.type === "tool_use") emitir(run, { tool: bloco.name, input: bloco.input });
        }
        const uso = msg.message?.usage;
        if (uso) {
          run.tokens_input += uso.input_tokens ?? 0;
          run.tokens_output += uso.output_tokens ?? 0;
        }
      }

      if (msg.type === "result") {
        run.custo = msg.total_cost_usd ?? run.custo;
        if (msg.is_error) throw new Error(msg.result || "Erro na execução do agente");
      }
    }

    run.status = run.cancelado ? "cancelada" : "concluida";
  } catch (e) {
    run.status = "erro";
    run.erro = e.message;
    emitir(run, { text: `\n\n[erro] ${e.message}` });
  } finally {
    run.finalizado_em = now();
    emitir(run, { done: true });
    for (const enviar of run.listeners) enviar(null);
    await persistir(run);
  }
}

/** Grava resposta, tokens e custo de volta no Supabase. */
async function persistir(run) {
  if (!supabase) return;
  try {
    await supabase
      .from("aip_executions")
      .update({
        status: run.status,
        resposta: run.texto,
        erro: run.erro ?? null,
        tokens_input: run.tokens_input,
        tokens_output: run.tokens_output,
        custo: run.custo,
        remote_run_id: run.id,
        finalizado_em: run.finalizado_em ?? now(),
      })
      .eq("id", run.id);
  } catch (e) {
    console.error("Falha ao persistir execução", e.message);
  }
}

app.post("/health", (req, res) => {
  if (!autenticar(req, res)) return;
  res.json({
    ok: true,
    versao: "1.0.0",
    anthropic: Boolean(ANTHROPIC_API_KEY),
    supabase: Boolean(supabase),
    execucoes_ativas: [...runs.values()].filter((r) => r.status === "executando").length,
  });
});

app.post("/start", (req, res) => {
  if (!autenticar(req, res)) return;
  const { execution_id: id } = req.body || {};
  if (!id) return res.status(400).json({ error: "execution_id obrigatório" });
  const run = obter(id);
  if (run.status === "executando") return res.json({ ok: true, ja_rodando: true });
  executar(run, req.body); // não bloqueia
  res.json({ ok: true, execution_id: id, status: "executando" });
});

app.post("/stream", (req, res) => {
  if (!autenticar(req, res)) return;
  const { execution_id: id } = req.body || {};
  const run = obter(id);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  if (run.texto) res.write(`data: ${JSON.stringify({ text: run.texto })}\n\n`);

  const enviar = (payload) => {
    if (payload === null) {
      res.write("data: [DONE]\n\n");
      return res.end();
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  if (["concluida", "erro", "cancelada"].includes(run.status)) return enviar(null);

  run.listeners.add(enviar);
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => {
    clearInterval(ping);
    run.listeners.delete(enviar);
  });
});

app.post("/resume", async (req, res) => {
  if (!autenticar(req, res)) return;
  const { execution_id: id, resultado } = req.body || {};
  const run = obter(id);
  run.aguardando = null;
  run.status = "executando";
  escrever(run, `\n\n[aprovação recebida] ${JSON.stringify(resultado ?? {})}\n`);
  executar(run, { ...req.body, prompt: `Continue a execução. Itens aprovados: ${JSON.stringify(resultado ?? {})}` });
  res.json({ ok: true });
});

app.post("/cancel", async (req, res) => {
  if (!autenticar(req, res)) return;
  const { execution_id: id } = req.body || {};
  const run = obter(id);
  run.cancelado = true;
  run.status = "cancelada";
  emitir(run, { text: "\n\n[cancelada pelo usuário]" });
  for (const enviar of run.listeners) enviar(null);
  await persistir(run);
  res.json({ ok: true });
});

app.post("/status", (req, res) => {
  if (!autenticar(req, res)) return;
  const run = runs.get(req.body?.execution_id);
  if (!run) return res.json({ status: "desconhecida" });
  const { listeners, ...resto } = run;
  res.json(resto);
});

app.get("/", (_req, res) => res.send("AIP Agent SDK Server online"));

const porta = process.env.PORT || 8080;
app.listen(porta, () => console.log(`AIP Agent SDK Server ouvindo na porta ${porta}`));
