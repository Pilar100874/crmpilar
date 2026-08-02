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

export const agentRunner = {
  start: (payload: StartRunPayload) => callProxy("start", payload as any),
  resume: (executionId: string, approvalId: string, resultado: unknown) =>
    callProxy("resume", { execution_id: executionId, approval_id: approvalId, resultado }),
  cancel: (executionId: string) => callProxy("cancel", { execution_id: executionId }),
  status: (executionId: string) => callProxy("status", { execution_id: executionId }),
  health: () => callProxy("health", {}),
};

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
