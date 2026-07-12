import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Inicia o fluxo OAuth para uma plataforma de Ads.
 * Body: { estabelecimento_id, platform: 'google'|'meta'|'tiktok', redirect_to }
 * Retorna: { auth_url }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { estabelecimento_id, platform, redirect_to } = await req.json();
    if (!estabelecimento_id || !platform || !redirect_to) {
      return json({ error: "Parâmetros obrigatórios: estabelecimento_id, platform, redirect_to" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: app } = await supabase
      .from("ads_platform_apps")
      .select("*")
      .eq("estabelecimento_id", estabelecimento_id)
      .maybeSingle();

    if (!app) return json({ error: "Configure primeiro o App do Desenvolvedor em Conexões." }, 400);

    const state = btoa(JSON.stringify({ estabelecimento_id, platform, ts: Date.now() }));
    const cbBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ads-oauth-callback`;

    let authUrl = "";
    if (platform === "google") {
      if (!app.google_client_id) return json({ error: "google_client_id não configurado" }, 400);
      const params = new URLSearchParams({
        client_id: app.google_client_id,
        redirect_uri: cbBase,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: "https://www.googleapis.com/auth/adwords",
        state: `${state}::${redirect_to}`,
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else if (platform === "meta") {
      if (!app.meta_app_id) return json({ error: "meta_app_id não configurado" }, 400);
      const params = new URLSearchParams({
        client_id: app.meta_app_id,
        redirect_uri: cbBase,
        response_type: "code",
        scope: "ads_management,ads_read,business_management",
        state: `${state}::${redirect_to}`,
      });
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
    } else if (platform === "tiktok") {
      if (!app.tiktok_app_id) return json({ error: "tiktok_app_id não configurado" }, 400);
      const params = new URLSearchParams({
        app_id: app.tiktok_app_id,
        redirect_uri: cbBase,
        state: `${state}::${redirect_to}`,
      });
      authUrl = `https://business-api.tiktok.com/portal/auth?${params}`;
    } else {
      return json({ error: "Plataforma não suportada" }, 400);
    }

    return json({ auth_url: authUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
