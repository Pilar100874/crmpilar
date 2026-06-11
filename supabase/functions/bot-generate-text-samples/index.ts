import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callGateway(apiKey: string, body: Record<string, any>) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw Object.assign(new Error(`${resp.status} ${text.slice(0, 200)}`), { status: resp.status });
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { theme = "", count = 3 } = await req.json();
    if (!theme.trim()) {
      return new Response(JSON.stringify({ error: "theme é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const n = Math.max(1, Math.min(6, Number(count) || 3));

    const sys = "Você é um copywriter brasileiro especialista em peças de marketing curtas (banners, posts, anúncios). Sempre responda APENAS com JSON válido no formato solicitado, sem texto extra.";
    const user = [
      `Tema/briefing: ${theme}`,
      `Gere ${n} variações distintas de copy para uma peça gráfica.`,
      `Cada variação deve ter:`,
      `- title: chamada principal curta e impactante (até 50 caracteres)`,
      `- subtitle: complemento de apoio (até 80 caracteres)`,
      `- body: descrição/CTA breve (até 140 caracteres)`,
      `Responda APENAS com JSON no formato:`,
      `{"options":[{"title":"...","subtitle":"...","body":"..."}, ...]}`,
    ].join("\n");

    const data = await callGateway(LOVABLE_API_KEY, {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)); } catch { parsed = {}; }
    const options = Array.isArray(parsed?.options) ? parsed.options.slice(0, n).map((o: any) => ({
      title: String(o?.title || "").trim(),
      subtitle: String(o?.subtitle || "").trim(),
      body: String(o?.body || "").trim(),
    })).filter((o: any) => o.title || o.subtitle || o.body) : [];

    return new Response(JSON.stringify({ success: options.length > 0, options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("bot-generate-text-samples error:", e);
    const status = e?.status === 402 ? 402 : e?.status === 429 ? 429 : 500;
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
