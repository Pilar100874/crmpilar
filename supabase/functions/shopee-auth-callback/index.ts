import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    console.log("[Shopee] Callback recebido:", { code: !!code, shopId });

    if (!code || !shopId) {
      return new Response(generateHTML(false, "Parâmetros inválidos"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: contas, error: contaError } = await supabase
      .from("contas_marketplace")
      .select("id, configuracoes, estabelecimento_id, marketplace:marketplaces!inner(nome)")
      .eq("marketplace.nome", "shopee")
      .is("seller_id", null);

    if (contaError || !contas || contas.length === 0) {
      console.error("[Shopee] Conta não encontrada");
      return new Response(generateHTML(false, "Conta não encontrada"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const conta = contas[0];
    const config = conta.configuracoes as Record<string, string>;
    const partnerId = config.shopee_partner_id;
    const partnerKey = config.shopee_partner_key;

    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/token/get";
    const baseString = `${partnerId}${path}${timestamp}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(partnerKey);
    const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
    const sign = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBuffer)));

    const tokenResponse = await fetch(
      `https://partner.shopeemobile.com/api/v2/auth/token/get?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, shop_id: parseInt(shopId), partner_id: parseInt(partnerId) }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("[Shopee] Erro ao obter token:", tokenData);
      return new Response(generateHTML(false, tokenData.message || "Erro ao obter token"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiracao = new Date();
    expiracao.setSeconds(expiracao.getSeconds() + tokenData.expire_in);

    await supabase
      .from("contas_marketplace")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        data_expiracao_token: expiracao.toISOString(),
        seller_id: shopId,
        status: "conectado",
        configuracoes: { ...config, oauth_state: null },
      })
      .eq("id", conta.id);

    await supabase.from("marketplace_logs").insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: "conexao",
      mensagem: "Conta conectada com sucesso à Shopee",
      sucesso: true,
      detalhes: { shop_id: shopId },
    });

    console.log(`[Shopee] Conta ${conta.id} conectada com sucesso`);

    return new Response(generateHTML(true, "Conta Shopee conectada com sucesso!"), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Shopee] Erro no callback:", error);
    return new Response(generateHTML(false, error.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function generateHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html><html><head><title>Shopee - ${success ? "Sucesso" : "Erro"}</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:white}.container{text-align:center;padding:40px}.icon{font-size:64px;margin-bottom:20px}.message{font-size:18px;margin-bottom:20px}.close-info{color:#888;font-size:14px}</style></head><body><div class="container"><div class="icon">${success ? "✅" : "❌"}</div><div class="message">${message}</div><div class="close-info">Esta janela será fechada automaticamente...</div></div><script>window.opener?.postMessage({type:'shopee-oauth',success:${success},message:'${message}'},'*');setTimeout(()=>window.close(),2000)</script></body></html>`;
}
