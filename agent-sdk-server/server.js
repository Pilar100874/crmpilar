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
const DEPLOY_HOOK = process.env.RAILWAY_DEPLOY_HOOK_URL || "";
const VERSAO = process.env.APP_VERSION || "1.1.0";
const INICIADO_EM = new Date().toISOString();

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
    versao: VERSAO,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    uptime_s: Math.round(process.uptime()),
    iniciado_em: INICIADO_EM,
    anthropic: Boolean(ANTHROPIC_API_KEY),
    supabase: Boolean(supabase),
    atualizacao_disponivel: Boolean(DEPLOY_HOOK),
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

/**
 * Diagnóstico de servidores MCP.
 * O navegador não consegue fazer esse handshake (CORS), então o runner faz a
 * chamada JSON-RPC no servidor e devolve o status real + lista de ferramentas.
 *
 * Body: { endpoint, tipo?, cabecalhos?, timeout_ms? }
 */
app.post("/mcp/probe", async (req, res) => {
  if (!autenticar(req, res)) return;
  const { endpoint, cabecalhos, timeout_ms } = req.body || {};
  if (!endpoint) return res.status(400).json({ ok: false, erro: "endpoint obrigatório" });

  const iniciou = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(timeout_ms) || 10000);

  const chamar = (metodo, params) =>
    fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Exigido pelo MCP Streamable HTTP — sem isso o servidor responde 406.
        Accept: "application/json, text/event-stream",
        ...(cabecalhos && typeof cabecalhos === "object" ? cabecalhos : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: metodo, params }),
    });

  const extrair = (texto) => {
    for (const linha of texto.split("\n")) {
      const conteudo = linha.startsWith("data:") ? linha.slice(5).trim() : linha.trim();
      if (!conteudo || conteudo === "[DONE]") continue;
      try {
        return JSON.parse(conteudo);
      } catch {
        /* próxima linha */
      }
    }
    return null;
  };

  try {
    const init = await chamar("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "aip-runner", version: "1.0.0" },
    });
    const infoServidor = extrair(await init.text())?.result?.serverInfo ?? null;

    const lista = await chamar("tools/list", {});
    const corpo = await lista.text();
    const parsed = extrair(corpo);
    clearTimeout(timer);

    const ferramentas = (parsed?.result?.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? "",
    }));

    if (!lista.ok || parsed?.error) {
      return res.json({
        ok: false,
        status: "erro",
        http: lista.status,
        erro: parsed?.error?.message || `HTTP ${lista.status}`,
        latencia_ms: Date.now() - iniciou,
      });
    }

    res.json({
      ok: true,
      status: "conectado",
      http: lista.status,
      servidor: infoServidor,
      ferramentas,
      total_ferramentas: ferramentas.length,
      latencia_ms: Date.now() - iniciou,
      verificado_em: now(),
    });
  } catch (e) {
    clearTimeout(timer);
    res.json({
      ok: false,
      status: "erro",
      erro: e.name === "AbortError" ? "Tempo esgotado no handshake" : e.message,
      latencia_ms: Date.now() - iniciou,
    });
  }
});

/**
 * Painel de monitoramento: estado do processo + execuções conhecidas.
 * Body opcional: { limite? }
 */
app.post("/runs", (req, res) => {
  if (!autenticar(req, res)) return;
  const limite = Number(req.body?.limite) || 50;
  const lista = [...runs.values()]
    .map(({ listeners, ...r }) => ({
      ...r,
      ouvintes: listeners.size,
      caracteres: r.texto?.length ?? 0,
      texto: undefined,
      previa: (r.texto ?? "").slice(-400),
      duracao_ms:
        new Date(r.finalizado_em ?? now()).getTime() - new Date(r.criado_em).getTime(),
    }))
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
    .slice(0, limite);

  const contagem = lista.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const mem = process.memoryUsage();
  res.json({
    ok: true,
    servidor: {
      versao: VERSAO,
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      ambiente: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "producao",
      node: process.version,
      uptime_s: Math.round(process.uptime()),
      iniciado_em: INICIADO_EM,
      memoria_mb: Math.round(mem.rss / 1048576),
      heap_mb: Math.round(mem.heapUsed / 1048576),
      anthropic: Boolean(ANTHROPIC_API_KEY),
      supabase: Boolean(supabase),
      atualizacao_disponivel: Boolean(DEPLOY_HOOK),
    },
    contagem,
    total: runs.size,
    execucoes: lista,
    verificado_em: now(),
  });
});

/** Limpa execuções finalizadas da memória. */
app.post("/runs/limpar", (req, res) => {
  if (!autenticar(req, res)) return;
  let removidas = 0;
  for (const [id, r] of runs) {
    if (["concluida", "erro", "cancelada"].includes(r.status) && r.listeners.size === 0) {
      runs.delete(id);
      removidas++;
    }
  }
  res.json({ ok: true, removidas, restantes: runs.size });
});

/**
 * Atualização do servidor: dispara o Deploy Hook do Railway (redeploy da
 * última versão do repositório). Configure RAILWAY_DEPLOY_HOOK_URL no Railway.
 */
app.post("/update", async (req, res) => {
  if (!autenticar(req, res)) return;
  if (!DEPLOY_HOOK) {
    return res.json({
      ok: false,
      erro: "RAILWAY_DEPLOY_HOOK_URL não configurada no servidor",
    });
  }
  const ativas = [...runs.values()].filter((r) => r.status === "executando").length;
  if (ativas > 0 && !req.body?.forcar) {
    return res.json({ ok: false, erro: `${ativas} execução(ões) em andamento`, ativas });
  }
  try {
    const r = await fetch(DEPLOY_HOOK, { method: "POST" });
    const texto = await r.text();
    res.json({
      ok: r.ok,
      http: r.status,
      resposta: texto.slice(0, 500),
      versao_atual: VERSAO,
      disparado_em: now(),
      ...(r.ok ? {} : { erro: `HTTP ${r.status}` }),
    });
  } catch (e) {
    res.json({ ok: false, erro: e.message });
  }
});

/** Painel visual (HTML) do servidor. */
const PAINEL_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AIP Agent SDK Server — Painel</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light;--bg:#f7f8fa;--card:#ffffff;--line:#e4e8ee;--fg:#2c323b;--mut:#6b7787;--pri:#f97316;--pri-2:#fb9a4b;--dark:#2b303b;--ok:#16a34a;--err:#dc2626;--wrn:#f59e0b;--r:6px;
--sh:0 1px 2px 0 rgba(40,30,20,.05);--sh-lg:0 10px 15px -3px rgba(40,30,20,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif}
header{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding:14px 24px;background:var(--dark);color:#fff;box-shadow:var(--sh-lg)}
header .mut{color:#aab3c0}
.logo{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(135deg,#f97316,#fb9a4b);box-shadow:0 0 18px rgba(249,115,22,.35)}
h1{font-size:16px;margin:0;font-weight:600;letter-spacing:-.01em}
.mut{color:var(--mut)}
main{padding:22px 24px 40px;display:grid;gap:18px;max-width:1200px;margin:0 auto}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px;box-shadow:var(--sh);transition:box-shadow .2s,transform .2s}
.grid .card:hover{box-shadow:var(--sh-lg);transform:translateY(-2px)}
.card h3{margin:0 0 6px;font-size:11px;font-weight:600;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.card p{margin:0;font-size:20px;font-weight:600;color:var(--dark)}
input,button{font:inherit;border-radius:var(--r);border:1px solid rgba(255,255,255,.18);padding:8px 12px;background:rgba(255,255,255,.08);color:#fff}
input::placeholder{color:#9aa4b2}
button{cursor:pointer;background:linear-gradient(135deg,#f97316,#fb9a4b);border-color:transparent;color:#fff;font-weight:600;transition:filter .15s}
button:hover{filter:brightness(1.07)}
button.ghost{background:transparent;color:#e7eaef;border-color:rgba(255,255,255,.2);font-weight:500}
button.ghost:hover{background:rgba(255,255,255,.1)}
main button{border-color:var(--line)}main button.ghost{color:var(--fg);border-color:var(--line);background:#fff}
main button.ghost:hover{background:#fff5ec;border-color:var(--pri);color:var(--pri)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line)}
tbody tr:hover{background:#fffaf5}
th{color:var(--mut);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:500;background:#eef1f5;color:var(--mut)}
.b-executando{background:#fff1e3;color:#c2410c}.b-concluida{background:#e8f7ee;color:var(--ok)}
.b-erro{background:#fdeaea;color:var(--err)}.b-cancelada{background:#fef4e2;color:#b45309}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:8px;box-shadow:0 0 0 3px rgba(255,255,255,.12)}
pre{background:#fafbfc;border:1px solid var(--line);border-radius:var(--r);padding:12px;overflow:auto;max-height:260px;white-space:pre-wrap}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
</style></head><body>
<header>
  <div class="row"><div class="logo">P</div><span class="dot" id="dot" style="background:#8b95a5"></span><h1>Pilar · Motor de Agentes IA</h1><span class="mut" id="sub">carregando…</span></div>
  <div class="row">
    <input id="key" type="password" placeholder="Runner Key" style="width:200px"/>
    <button onclick="salvar()">Conectar</button>
    <button class="ghost" onclick="carregar()">Atualizar</button>
    <button class="ghost" onclick="limpar()">Limpar finalizadas</button>
    <button class="ghost" onclick="atualizarServidor()">Atualizar servidor</button>
  </div>
</header>
<main>
  <div class="grid" id="metricas"></div>
  <div class="card">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">Execuções</h3><span class="mut" id="cont"></span></div>
    <div style="overflow:auto"><table><thead><tr><th>ID</th><th>Status</th><th>Início</th><th>Duração</th><th>Tokens</th><th>Custo</th><th></th></tr></thead><tbody id="linhas"></tbody></table></div>
  </div>
  <div class="card" id="boxPrev" style="display:none"><h3>Prévia da saída</h3><pre id="prev"></pre></div>
</main>
<script>
const el=id=>document.getElementById(id);
el('key').value=localStorage.getItem('runnerKey')||'';
function salvar(){localStorage.setItem('runnerKey',el('key').value);carregar();}
async function api(rota,body={}){const r=await fetch(rota,{method:'POST',headers:{'Content-Type':'application/json','X-Runner-Key':el('key').value},body:JSON.stringify(body)});return r.json();}
function fmtDur(ms){if(!ms||ms<0)return '—';const s=Math.round(ms/1000);return s<60?s+'s':Math.floor(s/60)+'m '+(s%60)+'s';}
function fmtUp(s){if(s==null)return '—';const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return (d?d+'d ':'')+(h?h+'h ':'')+m+'m';}
async function carregar(){
  const d=await api('/runs',{limite:50});
  if(!d.ok){el('sub').textContent=d.error||'Não autorizado — informe a Runner Key';el('dot').style.background='var(--err)';return;}
  const s=d.servidor||{};
  el('dot').style.background='var(--ok)';
  el('sub').textContent='online · v'+(s.versao||'?')+(s.commit?' · '+s.commit:'')+' · '+(s.ambiente||'');
  el('metricas').innerHTML=[
    ['Uptime',fmtUp(s.uptime_s)],['Memória RSS',(s.memoria_mb??'—')+' MB'],['Heap',(s.heap_mb??'—')+' MB'],
    ['Node',s.node||'—'],['Anthropic',s.anthropic?'configurado':'ausente'],['Supabase',s.supabase?'conectado':'ausente'],
    ['Execuções',d.total??0],['Rodando',(d.contagem||{}).executando??0]
  ].map(([t,v])=>'<div class="card"><h3>'+t+'</h3><p>'+v+'</p></div>').join('');
  el('cont').textContent=Object.entries(d.contagem||{}).map(([k,v])=>k+': '+v).join(' · ');
  el('linhas').innerHTML=(d.execucoes||[]).map(r=>'<tr><td class="mut">'+r.id.slice(0,8)+'</td>'+
    '<td><span class="badge b-'+r.status+'">'+r.status+'</span></td>'+
    '<td class="mut">'+new Date(r.criado_em).toLocaleString('pt-BR')+'</td>'+
    '<td>'+fmtDur(r.duracao_ms)+'</td>'+
    '<td>'+((r.tokens_input||0)+'/'+(r.tokens_output||0))+'</td>'+
    '<td>'+(r.custo!=null?'US$ '+Number(r.custo).toFixed(4):'—')+'</td>'+
    '<td class="row"><button class="ghost" onclick="ver('+JSON.stringify(JSON.stringify(r.previa||r.erro||'')).replace(/"/g,'&quot;')+')">Ver</button>'+
    (r.status==='executando'?'<button class="ghost" onclick="cancelar(\\''+r.id+'\\')">Cancelar</button>':'')+'</td></tr>').join('')
    ||'<tr><td colspan="7" class="mut">Nenhuma execução em memória.</td></tr>';
}
function ver(t){el('boxPrev').style.display='block';el('prev').textContent=JSON.parse(t)||'(sem saída)';}
async function cancelar(id){await api('/cancel',{execution_id:id});carregar();}
async function limpar(){await api('/runs/limpar');carregar();}
async function atualizarServidor(){if(!confirm('Disparar redeploy do servidor?'))return;const d=await api('/update',{});alert(d.ok?'Redeploy disparado.':'Falhou: '+(d.erro||''));}
carregar();setInterval(carregar,5000);
</script></body></html>`;

app.get("/", (_req, res) => res.type("html").send(PAINEL_HTML));

const porta = process.env.PORT || 8080;
app.listen(porta, () => console.log(`AIP Agent SDK Server ouvindo na porta ${porta}`));

