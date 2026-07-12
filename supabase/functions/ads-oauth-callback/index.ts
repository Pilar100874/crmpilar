import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Callback OAuth: troca `code` por access/refresh tokens e salva em ad_accounts.
 * Retorna HTML que fecha a aba e redireciona.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");

  if (error) return htmlClose(`Erro: ${error}`, "");
  if (!code || !stateRaw) return htmlClose("Parâmetros ausentes", "");

  try {
    const [stateB64, redirectTo] = stateRaw.split("::");
    const { estabelecimento_id, platform } = JSON.parse(atob(stateB64));

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: app } = await supabase
      .from("ads_platform_apps")
      .select("*")
      .eq("estabelecimento_id", estabelecimento_id)
      .maybeSingle();
    if (!app) return htmlClose("App do Desenvolvedor não encontrado", redirectTo);

    const cb = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ads-oauth-callback`;
    let tokenRes: any = null;

    if (platform === "google") {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: app.google_client_id, client_secret: app.google_client_secret,
          redirect_uri: cb, grant_type: "authorization_code",
        }),
      });
      tokenRes = await res.json();
    } else if (platform === "meta") {
      const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: app.meta_app_id, client_secret: app.meta_app_secret, redirect_uri: cb, code,
      })}`);
      tokenRes = await res.json();
    } else if (platform === "tiktok") {
      const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: app.tiktok_app_id, secret: app.tiktok_app_secret, auth_code: code }),
      });
      tokenRes = await res.json();
      tokenRes = tokenRes?.data || tokenRes;
    }

    if (!tokenRes || tokenRes.error) {
      return htmlClose(`Falha ao trocar código: ${JSON.stringify(tokenRes)}`, redirectTo);
    }

    // Busca ou cria ad_account preliminar (usuário completa detalhes na UI)
    const { data: platformRow } = await supabase
      .from("ad_platforms")
      .select("id")
      .eq("nome", `${platform}_ads`)
      .maybeSingle();

    if (platformRow) {
      await supabase.from("ad_accounts").insert({
        estabelecimento_id,
        plataforma_id: platformRow.id,
        nome_conta: `Conta ${platform} (OAuth)`,
        conta_id: tokenRes.open_id || tokenRes.user_id || "pending",
        status: "ativo",
        credenciais: {
          access_token: tokenRes.access_token,
          refresh_token: tokenRes.refresh_token,
          expires_in: tokenRes.expires_in,
          obtained_at: new Date().toISOString(),
        },
      } as any);
    }

    return htmlClose(null, redirectTo, platform);
  } catch (e) {
    return htmlClose(`Erro: ${(e as Error).message}`, "");
  }
});

function htmlClose(errMsg: string | null, redirect: string, platform?: string) {
  const msg = errMsg
    ? `<h2 style="color:#c00">${errMsg}</h2><a href="${redirect}">Voltar</a>`
    : `<h2>✓ Conectado com sucesso${platform ? ` — ${platform}` : ""}</h2><p>Você pode fechar esta janela.</p><script>setTimeout(()=>{window.opener?.postMessage({type:'ads-oauth-success',platform:'${platform || ""}'},'*');window.close();},1200);</script>`;
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;padding:2rem;text-align:center">${msg}</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
