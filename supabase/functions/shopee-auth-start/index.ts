import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

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
    const partnerId = config?.shopee_partner_id;
    const partnerKey = config?.shopee_partner_key;
    const redirectUri = config?.shopee_redirect_uri;

    if (!partnerId || !partnerKey || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Configure Partner ID, Partner Key e Redirect URI primeiro" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = crypto.randomUUID();

    await supabase
      .from("contas_marketplace")
      .update({ configuracoes: { ...config, oauth_state: state } })
      .eq("id", contaMarketplaceId);

    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/auth_partner";
    const baseString = `${partnerId}${path}${timestamp}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(partnerKey);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
    const sign = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBuffer)));

    const authUrl = new URL("https://partner.shopeemobile.com/api/v2/shop/auth_partner");
    authUrl.searchParams.set("partner_id", partnerId);
    authUrl.searchParams.set("timestamp", timestamp.toString());
    authUrl.searchParams.set("sign", sign);
    authUrl.searchParams.set("redirect", redirectUri);

    console.log(`[Shopee] Auth URL gerada para conta ${contaMarketplaceId}`);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[Shopee] Erro ao gerar URL de autorização:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
