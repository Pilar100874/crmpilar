import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform sync function mapping
const platformSyncFunctions: Record<string, string> = {
  'google_ads': 'ads-google-sync',
  'meta_ads': 'ads-meta-sync',
  'tiktok_ads': 'ads-tiktok-sync',
  'mercadolivre_ads': 'ads-mercadolivre-sync',
  'amazon_ads': 'ads-amazon-sync',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { estabelecimentoId, dateRange } = await req.json();

    // Get all active accounts for this establishment
    const { data: accounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('*, plataforma:ad_platforms(*)')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('status', 'ativo');

    if (accountsError) {
      throw new Error('Erro ao buscar contas: ' + accountsError.message);
    }

    const results: any[] = [];

    for (const account of (accounts || [])) {
      const platformName = account.plataforma?.nome;
      const syncFunction = platformSyncFunctions[platformName];

      if (!syncFunction) {
        results.push({
          conta: account.nome_conta,
          plataforma: platformName,
          success: false,
          error: 'Função de sincronização não encontrada',
        });
        continue;
      }

      try {
        // Call the platform-specific sync function
        const { data, error } = await supabase.functions.invoke(syncFunction, {
          body: {
            contaId: account.id,
            estabelecimentoId,
            dateRange: dateRange || 30,
          },
        });

        results.push({
          conta: account.nome_conta,
          plataforma: account.plataforma?.nome_display,
          success: !error && data?.success,
          count: data?.count || 0,
          error: error?.message || data?.error,
        });
      } catch (e) {
        const eMessage = e instanceof Error ? e.message : 'Erro desconhecido';
        results.push({
          conta: account.nome_conta,
          plataforma: account.plataforma?.nome_display,
          success: false,
          error: eMessage,
        });
      }
    }

    // Log overall sync
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    await supabase.from('ads_logs_coleta').insert({
      estabelecimento_id: estabelecimentoId,
      tipo: successCount === totalCount ? 'success' : 'warning',
      mensagem: `Sincronização geral: ${successCount}/${totalCount} contas sincronizadas com sucesso.`,
      detalhes: { results },
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
