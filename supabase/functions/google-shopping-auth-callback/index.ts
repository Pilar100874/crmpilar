import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    console.log("[Google Shopping] Callback recebido:", { code: !!code, state });

    if (!code || !state) {
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
      .select("id, configuracoes, estabelecimento_id")
      .filter("configuracoes->oauth_state", "eq", state);

    if (contaError || !contas || contas.length === 0) {
      console.error("[Google Shopping] Conta não encontrada para state:", state);
      return new Response(generateHTML(false, "Sessão inválida ou expirada"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const conta = contas[0];
    const config = conta.configuracoes as Record<string, string>;

    // Trocar código por token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.google_client_id,
        client_secret: config.google_client_secret,
        redirect_uri: config.google_redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("[Google Shopping] Erro ao obter token:", tokenData);
      return new Response(generateHTML(false, tokenData.error_description || "Erro ao obter token"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiracao = new Date();
    expiracao.setSeconds(expiracao.getSeconds() + tokenData.expires_in);

    const { error: updateError } = await supabase
      .from("contas_marketplace")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        data_expiracao_token: expiracao.toISOString(),
        status: "conectado",
        configuracoes: { ...config, oauth_state: null },
      })
      .eq("id", conta.id);

    if (updateError) {
      console.error("[Google Shopping] Erro ao atualizar conta:", updateError);
      return new Response(generateHTML(false, "Erro ao salvar credenciais"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    await supabase.from("marketplace_logs").insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: "conexao",
      mensagem: "Conta conectada com sucesso ao Google Shopping",
      sucesso: true,
    });

    console.log(`[Google Shopping] Conta ${conta.id} conectada com sucesso`);

    return new Response(generateHTML(true, "Conta Google Shopping conectada com sucesso!"), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("[Google Shopping] Erro no callback:", error);
    return new Response(generateHTML(false, error.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function generateHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html><html><head><title>Google Shopping - ${success ? "Sucesso" : "Erro"}</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:white}.container{text-align:center;padding:40px}.icon{font-size:64px;margin-bottom:20px}.message{font-size:18px;margin-bottom:20px}.close-info{color:#888;font-size:14px}</style></head><body><div class="container"><div class="icon">${success ? "✅" : "❌"}</div><div class="message">${message}</div><div class="close-info">Esta janela será fechada automaticamente...</div></div><script>window.opener?.postMessage({type:'google-shopping-oauth',success:${success},message:'${message}'},'*');setTimeout(()=>window.close(),2000)</script></body></html>`;
}
