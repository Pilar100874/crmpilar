import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log(`🔐 Callback OAuth ML recebido. Code: ${code ? 'presente' : 'ausente'}, State: ${state}`);

    // Verificar se houve erro no OAuth
    if (error) {
      console.error('❌ Erro retornado pelo ML:', error);
      return new Response(redirectHtml('Erro na autorização: ' + error, false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      return new Response(redirectHtml('Parâmetros inválidos', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Extrair contaMarketplaceId e state do parâmetro state
    const [contaMarketplaceId, expectedState] = state.split(':');

    if (!contaMarketplaceId || !expectedState) {
      return new Response(redirectHtml('State inválido', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar conta e validar state
    const { data: conta, error: contaError } = await supabase
      .from('contas_marketplace')
      .select('*, estabelecimento_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      console.error('❌ Conta não encontrada:', contaError);
      return new Response(redirectHtml('Conta não encontrada', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    const config = conta.configuracoes as { 
      ml_client_id?: string; 
      ml_client_secret?: string; 
      ml_redirect_uri?: string;
      oauth_state?: string;
    } | null;

    // Validar state para segurança
    if (config?.oauth_state !== expectedState) {
      console.error('❌ State inválido');
      await supabase.from('marketplace_logs').insert({
        conta_marketplace_id: contaMarketplaceId,
        estabelecimento_id: conta.estabelecimento_id,
        tipo: 'oauth',
        mensagem: 'State inválido - possível tentativa de ataque CSRF',
        sucesso: false,
      });
      return new Response(redirectHtml('State inválido - segurança', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    if (!config?.ml_client_id || !config?.ml_client_secret || !config?.ml_redirect_uri) {
      return new Response(redirectHtml('Credenciais não configuradas', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Trocar code por access_token
    console.log('🔄 Trocando code por token...');
    
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.ml_client_id,
        client_secret: config.ml_client_secret,
        code: code,
        redirect_uri: config.ml_redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('❌ Erro ao obter token:', tokenData);
      await supabase.from('marketplace_logs').insert({
        conta_marketplace_id: contaMarketplaceId,
        estabelecimento_id: conta.estabelecimento_id,
        tipo: 'oauth',
        mensagem: `Erro ao obter token: ${tokenData.error || tokenData.message || 'Erro desconhecido'}`,
        sucesso: false,
      });
      return new Response(redirectHtml('Erro ao obter token: ' + (tokenData.error_description || tokenData.message), false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    console.log('✅ Token obtido com sucesso. User ID:', tokenData.user_id);

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Atualizar conta com tokens
    const { error: updateError } = await supabase
      .from('contas_marketplace')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        seller_id: tokenData.user_id.toString(),
        data_expiracao_token: expiresAt.toISOString(),
        status: 'conectado',
        configuracoes: {
          ...config,
          oauth_state: null, // Limpar state usado
          oauth_completed_at: new Date().toISOString(),
        },
      })
      .eq('id', contaMarketplaceId);

    if (updateError) {
      console.error('❌ Erro ao atualizar conta:', updateError);
      return new Response(redirectHtml('Erro ao salvar tokens', false), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Registrar sucesso
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: contaMarketplaceId,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'oauth',
      mensagem: `Conta conectada com sucesso! Seller ID: ${tokenData.user_id}`,
      sucesso: true,
    });

    console.log(`✅ Conta ${contaMarketplaceId} conectada com sucesso!`);

    return new Response(redirectHtml('Conta conectada com sucesso!', true), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (error: unknown) {
    console.error('❌ Erro no callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(redirectHtml('Erro interno: ' + errorMessage, false), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});

function redirectHtml(message: string, success: boolean): string {
  const color = success ? '#22c55e' : '#ef4444';
  const icon = success ? '✅' : '❌';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Mercado Livre - ${success ? 'Sucesso' : 'Erro'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    .message { font-size: 18px; color: ${color}; margin-bottom: 20px; }
    .hint { font-size: 14px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <div class="message">${message}</div>
    <div class="hint">Você pode fechar esta janela e voltar ao sistema.</div>
  </div>
  <script>
    // Notificar janela pai se existir
    if (window.opener) {
      window.opener.postMessage({ type: 'mercadolivre-oauth', success: ${success}, message: '${message}' }, '*');
    }
    // Fechar automaticamente após 3 segundos se sucesso
    ${success ? 'setTimeout(() => window.close(), 3000);' : ''}
  </script>
</body>
</html>
  `;
}
