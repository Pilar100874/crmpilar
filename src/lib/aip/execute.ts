import { supabase } from "@/integrations/supabase/client";

/** Eventos emitidos pelo motor de execução (edge function aip-execute-workflow). */
export interface EventoExecucao {
  evento:
    | "execucao"
    | "etapa_inicio"
    | "etapa_fim"
    | "texto"
    | "aprovacao"
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
  tokens?: number;
  resposta?: string;
  erro?: string;
}

export interface ExecutarOpts {
  workflowId?: string;
  executionId?: string;
  input?: Record<string, unknown>;
  modelo?: string;
  origem?: string;
  signal?: AbortSignal;
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
