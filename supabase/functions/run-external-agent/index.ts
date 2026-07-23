import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function interp(str: any, vars: Record<string, any> = {}): string {
  return String(str ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      provider = "claude",
      prompt = "",
      systemPrompt = "",
      variables = {},
      model,
      endpointUrl,
      apiKeySecret,
      timeoutSeconds = 120,
    } = body || {};

    const finalPrompt = interp(prompt, variables);
    const finalSystem = interp(systemPrompt, variables);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), Math.max(5, Math.min(600, Number(timeoutSeconds))) * 1000);

    let result: { ok: boolean; text?: string; raw?: any; error?: string } = { ok: false };

    try {
      if (provider === "lovable_ai") {
        const key = Deno.env.get("LOVABLE_API_KEY");
        if (!key) throw new Error("LOVABLE_API_KEY não configurada");
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: model || "google/gemini-2.5-flash",
            messages: [
              ...(finalSystem ? [{ role: "system", content: finalSystem }] : []),
              { role: "user", content: finalPrompt },
            ],
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `Gateway ${r.status}`);
        result = { ok: true, text: j?.choices?.[0]?.message?.content || "", raw: j };
      } else if (provider === "claude") {
        const key = Deno.env.get(apiKeySecret || "ANTHROPIC_API_KEY");
        if (!key) throw new Error(`Secret ${apiKeySecret || "ANTHROPIC_API_KEY"} não configurada`);
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: model || "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            ...(finalSystem ? { system: finalSystem } : {}),
            messages: [{ role: "user", content: finalPrompt }],
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `Claude ${r.status}`);
        const text = (j?.content || []).map((c: any) => c?.text || "").join("\n").trim();
        result = { ok: true, text, raw: j };
      } else if (provider === "chatgpt") {
        const key = Deno.env.get(apiKeySecret || "OPENAI_API_KEY");
        if (!key) throw new Error(`Secret ${apiKeySecret || "OPENAI_API_KEY"} não configurada`);
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [
              ...(finalSystem ? [{ role: "system", content: finalSystem }] : []),
              { role: "user", content: finalPrompt },
            ],
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `OpenAI ${r.status}`);
        result = { ok: true, text: j?.choices?.[0]?.message?.content || "", raw: j };
      } else {
        // cursor / custom => POST genérico
        if (!endpointUrl) throw new Error("endpointUrl obrigatório para provider customizado");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKeySecret) {
          const token = Deno.env.get(apiKeySecret);
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        const r = await fetch(endpointUrl, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({ prompt: finalPrompt, systemPrompt: finalSystem, variables }),
        });
        const txt = await r.text();
        let parsed: any = txt;
        try { parsed = JSON.parse(txt); } catch {}
        if (!r.ok) throw new Error(typeof parsed === "string" ? parsed : parsed?.error || `HTTP ${r.status}`);
        const text = typeof parsed === "string" ? parsed
          : parsed?.text || parsed?.response || parsed?.output || parsed?.message || JSON.stringify(parsed);
        result = { ok: true, text, raw: parsed };
      }
    } finally {
      clearTimeout(t);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
