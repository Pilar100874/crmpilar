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
    const contaMarketplaceId = url.searchParams.get("contaMarketplaceId");

    if (!contaMarketplaceId) {
      return new Response(
        JSON.stringify({ error: "contaMarketplaceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conta, error: contaError } = await supabase
      .from("contas_marketplace")
      .select("configuracoes, estabelecimento_id")
      .eq("id", contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      return new Response(
        JSON.stringify({ error: "Conta não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = conta.configuracoes as Record<string, string>;
    const clientId = config?.carrefour_client_id;
    const redirectUri = config?.carrefour_redirect_uri;

    if (!clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Configure o Client ID e Redirect URI primeiro" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = crypto.randomUUID();

    await supabase
      .from("contas_marketplace")
      .update({ configuracoes: { ...config, oauth_state: state } })
      .eq("id", contaMarketplaceId);

    const authUrl = new URL("https://api-marketplace.carrefour.com.br/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", `${contaMarketplaceId}:${state}`);

    console.log(`[Carrefour] Auth URL gerada para conta ${contaMarketplaceId}`);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[Carrefour] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
