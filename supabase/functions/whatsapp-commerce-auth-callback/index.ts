import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(generateHTML(false, `Erro: ${error}`), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(generateHTML(false, "Parâmetros inválidos"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const [contaMarketplaceId, expectedState] = state.split(":");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conta, error: contaError } = await supabase
      .from("contas_marketplace")
      .select("*, estabelecimento_id")
      .eq("id", contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      return new Response(generateHTML(false, "Conta não encontrada"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const config = conta.configuracoes as Record<string, string>;

    if (config?.oauth_state !== expectedState) {
      return new Response(generateHTML(false, "State inválido"), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    // Exchange code for access token using Facebook Graph API
    const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "GET",
    });

    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", config.whatsapp_app_id);
    tokenUrl.searchParams.set("client_secret", config.whatsapp_app_secret);
    tokenUrl.searchParams.set("redirect_uri", config.whatsapp_redirect_uri);
    tokenUrl.searchParams.set("code", code);

    const tokenResp = await fetch(tokenUrl.toString());
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok || tokenData.error) {
      return new Response(generateHTML(false, `Erro ao obter token: ${tokenData.error?.message || tokenData.message}`), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 5184000)); // 60 days default

    await supabase
      .from("contas_marketplace")
      .update({
        access_token: tokenData.access_token,
        data_expiracao_token: expiresAt.toISOString(),
        status: "conectado",
        configuracoes: { ...config, oauth_state: null },
      })
      .eq("id", contaMarketplaceId);

    await supabase.from("marketplace_logs").insert({
      conta_marketplace_id: contaMarketplaceId,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: "oauth",
      mensagem: "Conta WhatsApp Commerce conectada com sucesso",
      sucesso: true,
    });

    return new Response(generateHTML(true, "Conta conectada com sucesso!"), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[WhatsApp Commerce] Erro no callback:", error);
    return new Response(generateHTML(false, error.message), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});

function generateHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>WhatsApp Commerce - ${success ? "Sucesso" : "Erro"}</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;color:white;}.container{text-align:center;padding:40px;background:rgba(255,255,255,0.1);border-radius:16px;}.icon{font-size:64px;margin-bottom:20px;}.message{font-size:18px;color:${success ? "#22c55e" : "#ef4444"};}</style>
</head>
<body><div class="container"><div class="icon">${success ? "✅" : "❌"}</div><div class="message">${message}</div><p>Você pode fechar esta janela.</p></div>
<script>if(window.opener){window.opener.postMessage({type:'whatsapp-commerce-oauth',success:${success},message:'${message}'},'*');}${success ? "setTimeout(()=>window.close(),2000);" : ""}</script>
</body></html>`;
}
