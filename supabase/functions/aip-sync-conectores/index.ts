import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Sincroniza o registro unificado de conectores (aip_conectores).
 *
 * Fontes:
 *  - aip_tools  → ferramentas HTTP/internas cadastradas
 *  - aip_mcps   → servidores MCP externos (faz handshake `tools/list`)
 *  - servidor MCP do próprio app (/functions/v1/mcp/.mcp/list-tools)
 *
 * Modos:
 *  - `{ estabelecimento_id }` ou JWT do usuário → sincroniza um estabelecimento
 *  - sem corpo (pg_cron / chamada interna)      → sincroniza todos
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Registro {
  tipo: string;
  ref: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  categoria: string | null;
  origem: string;
  status: string;
  disponivel: boolean;
  ferramentas: unknown[];
  metadados: Record<string, unknown>;
  ultimo_erro: string | null;
}

/** Faz `tools/list` num servidor MCP (Streamable HTTP). */
async function listarFerramentasMcp(endpoint: string, credencial?: string | null) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 15000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controle.signal,
      headers: {
        "Content-Type": "application/json",
        // Exigido pelo protocolo MCP Streamable HTTP.
        Accept: "application/json, text/event-stream",
        ...(credencial ? { Authorization: `Bearer ${credencial}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    const texto = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${texto.slice(0, 300)}`);

    // A resposta pode vir como JSON puro ou como evento SSE.
    let corpo = texto.trim();
    if (corpo.startsWith("event:") || corpo.startsWith("data:")) {
      corpo =
        corpo
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("") || "{}";
    }
    const parsed = JSON.parse(corpo);
    if (parsed.error) throw new Error(parsed.error.message ?? "Erro MCP");
    return (parsed.result?.tools ?? []) as { name: string; description?: string }[];
  } finally {
    clearTimeout(limite);
  }
}

/** Lê as ferramentas expostas pelo servidor MCP do próprio sistema. */
async function ferramentasDoApp() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/mcp/.mcp/list-tools`, {
      headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    });
    if (!res.ok) return { itens: [], erro: `HTTP ${res.status}` };
    const j = await res.json();
    return { itens: (j.tools ?? j.result?.tools ?? []) as any[], erro: null as string | null };
  } catch (e) {
    return { itens: [] as any[], erro: (e as Error).message };
  }
}

async function sincronizar(db: any, estabelecimentoId: string) {
  const registros: Registro[] = [];

  // 1) Ferramentas internas ------------------------------------------------
  const { data: tools } = await db
    .from("aip_tools")
    .select("*")
    .eq("estabelecimento_id", estabelecimentoId);

  for (const t of tools ?? []) {
    registros.push({
      tipo: "tool",
      ref: t.id,
      nome: t.nome,
      descricao: t.descricao ?? null,
      icone: "🔧",
      categoria: t.categoria ?? "api",
      origem: "aip_tools",
      status: t.status ?? "ativo",
      disponivel: (t.status ?? "ativo") === "ativo",
      ferramentas: [],
      metadados: { endpoint: t.endpoint, metodo: t.metodo, tags: t.tags ?? [] },
      ultimo_erro: null,
    });
  }

  // 2) Servidores MCP externos (com handshake) -----------------------------
  const { data: mcps } = await db
    .from("aip_mcps")
    .select("*")
    .eq("estabelecimento_id", estabelecimentoId);

  for (const m of mcps ?? []) {
    let ferramentas: any[] = m.ferramentas ?? [];
    let erro: string | null = null;
    let status = "conectado";
    try {
      ferramentas = await listarFerramentasMcp(m.endpoint, m.credencial_ref);
    } catch (e) {
      erro = (e as Error).message;
      status = "erro";
    }
    await db
      .from("aip_mcps")
      .update({
        status,
        ferramentas,
        ultimo_handshake: new Date().toISOString(),
        ultimo_erro: erro,
      })
      .eq("id", m.id);

    registros.push({
      tipo: "mcp",
      ref: m.id,
      nome: m.nome,
      descricao: m.descricao ?? null,
      icone: "🔌",
      categoria: "mcp",
      origem: "aip_mcps",
      status,
      disponivel: status === "conectado",
      ferramentas,
      metadados: { endpoint: m.endpoint, ambiente: m.ambiente, tipo: m.tipo },
      ultimo_erro: erro,
    });
  }

  // 3) Servidor MCP do próprio sistema (Claude Code / ChatGPT) -------------
  const app = await ferramentasDoApp();
  registros.push({
    tipo: "app_mcp",
    ref: "crm-pilar",
    nome: "CRM Pilar (MCP do sistema)",
    descricao: "Ferramentas do próprio CRM expostas para Claude Code, ChatGPT e outros clientes MCP.",
    icone: "🧠",
    categoria: "mcp",
    origem: "app",
    status: app.erro ? "erro" : "conectado",
    disponivel: !app.erro,
    ferramentas: app.itens,
    metadados: { endpoint: `${SUPABASE_URL}/functions/v1/mcp`, total: app.itens.length },
    ultimo_erro: app.erro,
  });

  // 4) Persistência: upsert + marcação dos que sumiram ---------------------
  const agora = new Date().toISOString();
  if (registros.length) {
    const { error } = await db.from("aip_conectores").upsert(
      registros.map((r) => ({ ...r, estabelecimento_id: estabelecimentoId, ultima_sync: agora })),
      { onConflict: "estabelecimento_id,tipo,ref" },
    );
    if (error) throw new Error(error.message);
  }

  await db
    .from("aip_conectores")
    .update({ disponivel: false, status: "removido", ultimo_erro: "Conector não encontrado na última sincronização" })
    .eq("estabelecimento_id", estabelecimentoId)
    .lt("ultima_sync", agora);

  return {
    estabelecimento_id: estabelecimentoId,
    total: registros.length,
    disponiveis: registros.filter((r) => r.disponivel).length,
    sincronizado_em: agora,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get("Authorization") ?? "";

    // Chamada de um usuário do app: sincroniza apenas o estabelecimento dele.
    if (authHeader && authHeader !== `Bearer ${SERVICE_KEY}` && authHeader !== `Bearer ${ANON_KEY}`) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return json({ error: "Não autenticado" }, 401);

      const { data: estab } = await userClient.rpc("get_auth_user_estabelecimento_id");
      const estabelecimentoId = (estab as string) ?? body.estabelecimento_id;
      if (!estabelecimentoId) return json({ error: "Estabelecimento não identificado" }, 400);

      return json(await sincronizar(db, estabelecimentoId));
    }

    // Chamada interna/agendada: sincroniza todos os estabelecimentos com dados.
    const alvos = new Set<string>(body.estabelecimento_id ? [body.estabelecimento_id] : []);
    if (alvos.size === 0) {
      for (const tabela of ["aip_tools", "aip_mcps", "aip_agents"]) {
        const { data } = await db.from(tabela).select("estabelecimento_id").limit(2000);
        (data ?? []).forEach((r: any) => r.estabelecimento_id && alvos.add(r.estabelecimento_id));
      }
      // Sem dados da plataforma ainda: registra ao menos o MCP do sistema por estabelecimento.
      if (alvos.size === 0) {
        const { data } = await db.from("estabelecimentos").select("id").limit(500);
        (data ?? []).forEach((r: any) => r.id && alvos.add(r.id));
      }
    }

    const resultados = [];
    for (const id of alvos) {
      try {
        resultados.push(await sincronizar(db, id));
      } catch (e) {
        resultados.push({ estabelecimento_id: id, erro: (e as Error).message });
      }
    }
    return json({ processados: resultados.length, resultados });
  } catch (e) {
    console.error("aip-sync-conectores", e);
    return json({ error: (e as Error).message }, 500);
  }
});
