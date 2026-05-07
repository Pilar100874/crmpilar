import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";

async function fetchWavespeedKey(estabelecimentoId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from("ai_api_keys")
    .select("api_key")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("provider", "wavespeed")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.api_key || null;
}

function mapErrorMessage(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid api key'))
    return "API Key do WaveSpeed inválida. Verifique nas configurações.";
  if (status === 402 || lower.includes('billing') || lower.includes('payment') || lower.includes('insufficient') || lower.includes('credits'))
    return "Créditos insuficientes no WaveSpeed. Recarregue em wavespeed.ai";
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many') || lower.includes('quota'))
    return "Limite de requisições atingido. Aguarde e tente novamente.";
  if (status >= 500) return "Erro interno do WaveSpeed. Tente novamente mais tarde.";
  return `Erro WaveSpeed (${status}): ${body.substring(0, 200)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, estabelecimentoId, params } = body;

    if (!estabelecimentoId) {
      return new Response(JSON.stringify({ error: "estabelecimentoId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = await fetchWavespeedKey(estabelecimentoId);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key do WaveSpeed não configurada. Vá em Configurações → APIs Pagas." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch task status (polling) ────────────────────────────────────
    if (action === "fetch") {
      const taskId = params.task_id;
      if (!taskId) {
        return new Response(JSON.stringify({ error: "task_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${WAVESPEED_BASE}/predictions/${taskId}/result`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        // 404 from /result means the task is still processing — return as "processing" not as error
        if (resp.status === 404) {
          return new Response(JSON.stringify({ status: "processing" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await resp.text();
        return new Response(JSON.stringify({ error: mapErrorMessage(resp.status, t) }), {
          status: resp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      // Normalize WaveSpeed response to our standard format
      const wsData = data.data || data;
      const status = wsData.status;
      const outputs = wsData.outputs || [];

      let normalized: any = { status };

      if (status === "completed") {
        // Outputs can be image URLs or video URLs
        if (outputs.length > 0) {
          const firstOutput = outputs[0];
          // Check if it's a video or image based on extension/content
          if (typeof firstOutput === 'string' && (firstOutput.includes('.mp4') || firstOutput.includes('video'))) {
            normalized.videoUrl = firstOutput;
          } else {
            normalized.imageUrl = firstOutput;
          }
          normalized.outputs = outputs;
        }
      } else if (status === "failed") {
        normalized.error = wsData.error || "Geração falhou no WaveSpeed";
      }

      return new Response(JSON.stringify(normalized), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Submit generation task ─────────────────────────────────────────
    if (action === "generate") {
      const modelPath = params.model;
      if (!modelPath) {
        return new Response(JSON.stringify({ error: "model obrigatório (ex: wavespeed-ai/flux-dev)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build the request body (remove our meta fields)
      const { model, ...requestBody } = params;

      console.log(`[wavespeed-proxy] Submitting task: model=${modelPath}, prompt="${(requestBody.prompt || '').substring(0, 80)}..."`);

      const resp = await fetch(`${WAVESPEED_BASE}/${modelPath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const t = await resp.text();
        if (t.trimStart().startsWith("<!DOCTYPE") || t.trimStart().startsWith("<html")) {
          return new Response(JSON.stringify({ error: `Modelo "${modelPath}" não disponível no WaveSpeed (${resp.status}).` }), {
            status: resp.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: mapErrorMessage(resp.status, t) }), {
          status: resp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const wsData = data.data || data;

      // If task completed immediately (sync response)
      if (wsData.status === "completed" && wsData.outputs?.length > 0) {
        const firstOutput = wsData.outputs[0];
        const isVideo = typeof firstOutput === 'string' && (firstOutput.includes('.mp4') || firstOutput.includes('video'));
        return new Response(JSON.stringify({
          status: "completed",
          taskId: wsData.id,
          ...(isVideo ? { videoUrl: firstOutput } : { imageUrl: firstOutput }),
          outputs: wsData.outputs,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Async task — return task ID for polling
      const taskId = wsData.id || wsData.urls?.get?.split('/').pop();
      return new Response(JSON.stringify({
        status: wsData.status || "processing",
        taskId,
        pollUrl: wsData.urls?.get,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wavespeed-proxy] Error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
