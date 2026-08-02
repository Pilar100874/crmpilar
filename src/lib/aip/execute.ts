import { supabase } from "@/integrations/supabase/client";

/** Eventos emitidos pelo motor de execução (edge function aip-execute-workflow). */
export interface EventoExecucao {
  evento:
    | "execucao"
    | "etapa_inicio"
    | "etapa_fim"
    | "texto"
    | "aprovacao"
    | "retry"
    | "fim";
  execution_id?: string;
  status?: string;
  total_etapas?: number;
  workflow?: string;
  step_id?: string | null;
  node_id?: string;
  ordem?: number;
  titulo?: string;
  tipo?: string;
  texto?: string;
  logs?: string | null;
  output?: unknown;
  duracao_ms?: number;
  tentativa?: number;
  tentativas_max?: number;
  aguardando_ms?: number;
  tokens?: number;
  resposta?: string;
  erro?: string;
  /** "timeout" | "cancelada" | "erro" — motivo da interrupção da etapa/execução. */
  motivo_interrupcao?: string;
}

export interface ExecutarOpts {
  workflowId?: string;
  executionId?: string;
  input?: Record<string, unknown>;
  modelo?: string;
  origem?: string;
  /** Reexecuta a partir de um bloco específico (ponto do erro). */
  retryNodeId?: string;
  /** Tentativas automáticas por bloco (1 = sem retry). */
  retryMax?: number;
  retryDelayMs?: number;
  /** Tempo limite padrão por etapa em ms (0 desativa). */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Solicita o cancelamento de uma execução em andamento.
 * O motor verifica a flag entre etapas (e a cada 2s durante a etapa),
 * registra o motivo no histórico e encerra a execução.
 */
export async function cancelarExecucao(executionId: string): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("aip_executions")
    .update({
      cancelamento_solicitado: true,
      cancelado_em: new Date().toISOString(),
      cancelado_por: sessao?.user?.id ?? null,
      motivo_interrupcao: "cancelada",
    })
    .eq("id", executionId);
  if (error) throw new Error(`Não foi possível cancelar: ${error.message}`);
}

/**
 * Executa (ou retoma) um workflow e entrega os eventos em streaming.
 * A persistência (execução + histórico por etapa) é feita no servidor.
 */
export async function executarWorkflow(
  opts: ExecutarOpts,
  onEvento: (e: EventoExecucao) => void,
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aip-execute-workflow`;

  const res = await fetch(url, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify({
      workflow_id: opts.workflowId,
      execution_id: opts.executionId,
      input: opts.input ?? {},
      modelo: opts.modelo,
      origem: opts.origem ?? "workflow",
      retry_node_id: opts.retryNodeId,
      retry_max: opts.retryMax,
      retry_delay_ms: opts.retryDelayMs,
      timeout_ms: opts.timeoutMs,
    }),
  });


  if (!res.ok || !res.body) {
    let detalhe = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) detalhe = j.error;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(`Falha ao iniciar execução: ${detalhe}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
      if (payload === "[DONE]") return;
      try {
        onEvento(JSON.parse(payload) as EventoExecucao);
      } catch {
        /* chunk parcial */
      }
    }
  }
}
