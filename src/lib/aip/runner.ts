import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente do servidor de execução (Claude Agent SDK / Railway).
 * O front nunca fala direto com o Railway: tudo passa pela Edge Function
 * `aip-run-proxy`, que guarda a URL e a chave do servidor.
 */

export interface StartRunPayload {
  execution_id: string;
  agent?: Record<string, unknown> | null;
  workflow?: Record<string, unknown> | null;
  skills?: Record<string, unknown>[];
  tools?: Record<string, unknown>[];
  mcps?: Record<string, unknown>[];
  modelo?: string;
  prompt?: string;
  input?: Record<string, unknown>;
}

async function callProxy(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("aip-run-proxy", {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface McpProbeResult {
  ok: boolean;
  status?: "conectado" | "erro";
  http?: number;
  erro?: string;
  servidor?: { name?: string; version?: string } | null;
  ferramentas?: Array<{ name: string; description?: string }>;
  total_ferramentas?: number;
  latencia_ms?: number;
  /** true quando o runner remoto não está configurado (proxy respondeu simulado). */
  simulado?: boolean;
}

export interface RunResumo {
  id: string;
  status: string;
  criado_em: string;
  finalizado_em?: string;
  duracao_ms?: number;
  tokens_input?: number;
  tokens_output?: number;
  custo?: number;
  erro?: string;
  ouvintes?: number;
  caracteres?: number;
  previa?: string;
}

export interface RunsResult {
  ok: boolean;
  simulado?: boolean;
  motivo?: string;
  servidor?: {
    versao?: string;
    commit?: string | null;
    ambiente?: string;
    node?: string;
    uptime_s?: number;
    iniciado_em?: string;
    memoria_mb?: number;
    heap_mb?: number;
    anthropic?: boolean;
    supabase?: boolean;
    atualizacao_disponivel?: boolean;
  };
  contagem?: Record<string, number>;
  total?: number;
  execucoes?: RunResumo[];
  verificado_em?: string;
}

export const agentRunner = {
  start: (payload: StartRunPayload) => callProxy("start", payload as any),
  resume: (executionId: string, approvalId: string, resultado: unknown) =>
    callProxy("resume", { execution_id: executionId, approval_id: approvalId, resultado }),
  cancel: (executionId: string) => callProxy("cancel", { execution_id: executionId }),
  status: (executionId: string) => callProxy("status", { execution_id: executionId }),
  health: () => callProxy("health", {}),
  /** Painel de monitoramento: estado do processo + execuções em memória. */
  runs: (limite = 50) => callProxy("runs", { limite }) as Promise<RunsResult>,
  /** Remove execuções finalizadas da memória do servidor. */
  limparRuns: () =>
    callProxy("runs/limpar", {}) as Promise<{ ok: boolean; removidas?: number; restantes?: number }>,
  /** Dispara o redeploy (Deploy Hook do Railway) para atualizar o servidor. */
  atualizar: (forcar = false) =>
    callProxy("update", { forcar }) as Promise<{
      ok: boolean;
      erro?: string;
      ativas?: number;
      versao_atual?: string;
      disparado_em?: string;
    }>,
  /**
   * Handshake real com um servidor MCP feito pelo runner (sem CORS no navegador).
   * Retorna status da conexão, ferramentas expostas e latência.
   */
  mcpProbe: (endpoint: string, cabecalhos?: Record<string, string>) =>
    callProxy("mcp/probe", { endpoint, cabecalhos }) as Promise<McpProbeResult>,
  /**
   * Executa um script de uma skill no formato pasta Claude Code.
   * Os arquivos da skill são enviados e recriados num workspace isolado do runner.
   */
  execSkillScript: (payload: SkillExecPayload) =>
    callProxy("skill/exec", payload as any) as Promise<SkillExecResult>,
  /** Verifica se o Chromium do Playwright está pronto no servidor remoto. */
  playwrightStatus: () =>
    callProxy("playwright/status", {}) as Promise<PlaywrightStatus>,
  /** Executa um roteiro de automação de navegador (Playwright) no runner. */
  playwrightRun: (payload: PlaywrightRunPayload) =>
    callProxy("playwright/run", payload as any) as Promise<PlaywrightRunResult>,
};

export type PlaywrightPasso =
  | { acao: "ir"; url: string }
  | { acao: "clicar"; seletor: string }
  | { acao: "preencher"; seletor: string; valor: string }
  | { acao: "esperar"; seletor?: string; ms?: number }
  | { acao: "texto"; seletor?: string; nome?: string }
  | { acao: "screenshot"; nome?: string; pagina_inteira?: boolean }
  | { acao: "pdf"; nome?: string }
  | { acao: "avaliar"; script: string; nome?: string };

export interface PlaywrightRunPayload {
  url?: string;
  passos: PlaywrightPasso[];
  timeout_ms?: number;
  viewport?: { width: number; height: number };
  user_agent?: string;
}

export interface PlaywrightRunResult {
  ok: boolean;
  erro?: string;
  url_final?: string;
  titulo?: string;
  logs?: string[];
  extraidos?: Record<string, unknown>;
  artefatos?: Array<{ nome: string; tipo: string; tamanho_bytes: number; base64: string }>;
  duracao_ms?: number;
  simulado?: boolean;
}

export interface PlaywrightStatus {
  ok: boolean;
  instalado?: boolean;
  navegador?: string;
  versao_navegador?: string;
  erro?: string;
  simulado?: boolean;
}

export interface SkillExecPayload {
  skill_slug: string;
  /** Arquivos da skill com caminho relativo (ex.: scripts/preflight.sh). */
  arquivos: Array<{ caminho: string; conteudo: string }>;
  /** Script a rodar, ex.: "scripts/preflight.sh". */
  script: string;
  args?: string[];
  env?: Record<string, string>;
  timeout_ms?: number;
}

export interface SkillExecResult {
  ok: boolean;
  codigo?: number;
  expirou?: boolean;
  workspace?: string;
  stdout?: string;
  stderr?: string;
  artefatos?: Array<{ caminho: string; tamanho_bytes: number }>;
  duracao_ms?: number;
  erro?: string;
  simulado?: boolean;
}



/** Stream SSE da execução (repassado pelo proxy). */
export async function streamRun(
  executionId: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const { data: session } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aip-run-proxy`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify({ action: "stream", execution_id: executionId }),
  });
  if (!res.ok || !res.body) throw new Error(`Falha no streaming (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        if (json.text) onChunk(json.text);
      } catch {
        onChunk(payload);
      }
    }
  }
}
