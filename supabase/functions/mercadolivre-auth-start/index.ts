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
    const contaMarketplaceId = url.searchParams.get('contaMarketplaceId');

    if (!contaMarketplaceId) {
      return new Response(JSON.stringify({ error: 'contaMarketplaceId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔐 Iniciando OAuth ML para conta: ${contaMarketplaceId}`);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados da conta
    const { data: conta, error: contaError } = await supabase
      .from('contas_marketplace')
      .select('*, estabelecimento_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      console.error('❌ Conta não encontrada:', contaError);
      return new Response(JSON.stringify({ error: 'Conta não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar credenciais da conta
    const config = conta.configuracoes as { ml_client_id?: string; ml_client_secret?: string; ml_redirect_uri?: string } | null;
    
    if (!config?.ml_client_id || !config?.ml_redirect_uri) {
      console.error('❌ Credenciais não configuradas');
      return new Response(JSON.stringify({ error: 'Credenciais do Mercado Livre não configuradas. Configure Client ID e Redirect URI.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar state único para segurança
    const state = crypto.randomUUID();

    // Salvar state temporariamente na conta (para validar no callback)
    await supabase
      .from('contas_marketplace')
      .update({ 
        configuracoes: { 
          ...config, 
          oauth_state: state,
          oauth_started_at: new Date().toISOString()
        } 
      })
      .eq('id', contaMarketplaceId);

    // Registrar log
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: contaMarketplaceId,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'oauth',
      mensagem: 'Fluxo OAuth iniciado - aguardando autorização do usuário',
      sucesso: true,
    });

    // Montar URL de autorização
    const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.ml_client_id);
    authUrl.searchParams.set('redirect_uri', config.ml_redirect_uri);
    authUrl.searchParams.set('state', `${contaMarketplaceId}:${state}`);

    console.log(`✅ URL de autorização gerada para conta ${contaMarketplaceId}`);

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      message: 'Redirecione o usuário para esta URL para autorizar'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Erro no auth-start:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
