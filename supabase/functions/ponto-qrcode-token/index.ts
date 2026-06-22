// Edge function: gera e valida tokens QR rotativos (HMAC) para marcação de ponto.
// Modo "generate": retorna token válido por 20s. Modo "validate": confere assinatura e janela.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-change";
const WINDOW_SECONDS = 20;

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, empresa_id, filial_id, token } = body as {
      action: "generate" | "validate";
      empresa_id?: string;
      filial_id?: string;
      token?: string;
    };

    if (action === "generate") {
      if (!empresa_id) {
        return new Response(JSON.stringify({ error: "empresa_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bucket = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
      const payload = `${empresa_id}:${filial_id || ""}:${bucket}`;
      const sig = await hmac(payload);
      const t = btoa(`${payload}:${sig}`);
      return new Response(
        JSON.stringify({ token: t, valid_seconds: WINDOW_SECONDS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "validate") {
      if (!token) {
        return new Response(JSON.stringify({ valid: false, reason: "sem token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let decoded: string;
      try {
        decoded = atob(token);
      } catch {
        return new Response(JSON.stringify({ valid: false, reason: "token inválido" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const parts = decoded.split(":");
      if (parts.length !== 4) {
        return new Response(JSON.stringify({ valid: false, reason: "formato" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const [emp, fil, bucket, sig] = parts;
      const expected = await hmac(`${emp}:${fil}:${bucket}`);
      if (expected !== sig) {
        return new Response(JSON.stringify({ valid: false, reason: "assinatura" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const now = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
      const diff = Math.abs(now - Number(bucket));
      if (diff > 1) {
        return new Response(JSON.stringify({ valid: false, reason: "expirado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ valid: true, empresa_id: emp, filial_id: fil || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
