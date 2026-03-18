import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFRAME_BASE = "https://api.apiframe.pro";

async function fetchApiframeKey(estabelecimentoId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from("ai_api_keys")
    .select("api_key")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("provider", "apiframe")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.api_key || null;
}

function mapErrorMessage(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid api key')) return "API Key do Apiframe inválida. Verifique nas configurações.";
  if (status === 402 || lower.includes('billing') || lower.includes('payment') || lower.includes('insufficient') || lower.includes('credits')) return "Créditos insuficientes no Apiframe. Recarregue em app.apiframe.ai";
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many') || lower.includes('quota')) return "Limite de requisições atingido. Aguarde e tente novamente.";
  if (status >= 500) return "Erro interno do Apiframe. Tente novamente mais tarde.";
  return `Erro Apiframe (${status}): ${body.substring(0, 200)}`;
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

    const apiKey = await fetchApiframeKey(estabelecimentoId);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key do Apiframe não configurada. Vá em Configurações → APIs Pagas." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Account / Credits check ────────────────────────────────────────
    if (action === "account") {
      const resp = await fetch(`${APIFRAME_BASE}/account`, {
        method: "GET",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        const t = await resp.text();
        return new Response(JSON.stringify({ error: mapErrorMessage(resp.status, t) }), {
          status: resp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch task status ──────────────────────────────────────────────
    if (action === "fetch") {
      const resp = await fetch(`${APIFRAME_BASE}/fetch`, {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: params.task_id }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Generic generation endpoints ───────────────────────────────────
    // Map action to apiframe endpoint
    const ENDPOINT_MAP: Record<string, string> = {
      // Image
      "midjourney-imagine": "/imagine",
      "flux-imagine": "/flux-imagine",
      "ideogram-imagine": "/ideogram-imagine",
      "ideogram-remix": "/ideogram-remix",
      "dall-e": "/dall-e",
      "gpt-image": "/gpt-image",
      "kling-image": "/kling-image",
      "nano-banana": "/nano-banana",
      "nano-banana-pro": "/nano-banana-pro",
      "seedream": "/seedream",
      "reve": "/reve",
      // Video
      "midjourney-video": "/imagine-video",
      "midjourney-video-extend": "/extend-video",
      "runway-imagine": "/runway-imagine",
      "kling-2.6": "/kling-imagine-2-6",
      "kling-2.5-turbo": "/kling-imagine",
      "luma-imagine": "/luma-imagine",
      "luma-extend": "/luma-extend",
      "google-veo": "/google-veo-imagine",
      "sora-2": "/sora-imagine",
      // Music
      "suno-imagine": "/suno-imagine",
      "suno-extend": "/suno-extend",
      "suno-lyrics": "/suno-lyrics",
      "udio-imagine": "/udio-imagine",
      "udio-extend": "/udio-extend",
      "producer-ai": "/producer-ai-imagine",
      "eleven-music": "/eleven-music",
      // Photo
      "ai-photo-generate": "/ai-photo-generate",
      // Upscale / Utils
      "faceswap": "/faceswap",
      "upscale-2x": "/upscale-2x",
      "upscale-4x": "/upscale-4x",
    };

    const endpoint = ENDPOINT_MAP[action];
    if (!endpoint) {
      return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(`${APIFRAME_BASE}${endpoint}`, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: mapErrorMessage(resp.status, t) }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[apiframe-proxy] Error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const msgLower = msg.toLowerCase();
    let status = 500;
    let friendlyMsg = msg;
    if (msgLower.includes("402") || msgLower.includes("billing") || msgLower.includes("credits") || msgLower.includes("insufficient")) {
      status = 402;
      friendlyMsg = "Créditos insuficientes no Apiframe. Recarregue em app.apiframe.ai";
    } else if (msgLower.includes("429") || msgLower.includes("rate limit") || msgLower.includes("quota")) {
      status = 429;
      friendlyMsg = "Limite de requisições atingido. Aguarde e tente novamente.";
    }
    return new Response(
      JSON.stringify({ error: friendlyMsg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
